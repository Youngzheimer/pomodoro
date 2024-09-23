import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";
import querystring from "querystring";
import session from "express-session";

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  port: number;
}

const config: SpotifyConfig = JSON.parse(
  fs.readFileSync("config.json", "utf-8")
);

const app = express();
const port = config.port;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.static(path.join(__dirname, "client", "build")));
app.use(
  session({
    secret: "your_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

declare module "express-session" {
  interface SessionData {
    accessToken: string;
    refreshToken: string;
  }
}

const spotifyApi = axios.create({
  baseURL: "https://api.spotify.com/v1",
});

app.get("/api/login", (req, res) => {
  const scope = "user-read-currently-playing";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: config.clientId,
        scope: scope,
        redirect_uri: config.redirectUri,
      })
  );
});

app.get("/api/callback", async (req, res) => {
  const code = req.query.code as string;

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        code: code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(config.clientId + ":" + config.clientSecret).toString(
              "base64"
            ),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    req.session.accessToken = response.data.access_token;
    req.session.refreshToken = response.data.refresh_token;

    res.redirect("/");
  } catch (error) {
    console.error("Error during authentication:", error);
    res.status(500).send("Authentication failed");
  }
});

async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(config.clientId + ":" + config.clientSecret).toString(
              "base64"
            ),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

app.get("/api/current-track", async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const response = await spotifyApi.get("/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${req.session.accessToken}` },
    });

    if (response.status === 204) {
      res.json({ isPlaying: false });
    } else {
      const track = response.data.item;
      res.json({
        isPlaying: true,
        albumCover: track.album.images[0].url,
        title: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(", "),
        link: track.external_urls.spotify,
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        const newAccessToken = await refreshAccessToken(
          req.session.refreshToken as string
        );
        req.session.accessToken = newAccessToken;
        return res
          .status(401)
          .json({ error: "Token refreshed, please try again" });
      } catch (refreshError) {
        return res.status(401).json({ error: "Authentication failed" });
      }
    }
    console.error("Error fetching current track:", error);
    res.status(500).json({ error: "Failed to fetch current track" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
