import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";
import querystring from "querystring";

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const config: SpotifyConfig = JSON.parse(
  fs.readFileSync("config.json", "utf-8")
);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "client", "build")));

let accessToken: string | null = null;
let refreshToken: string | null = null;

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

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;

    res.redirect("/");
  } catch (error) {
    console.error("Error during authentication:", error);
    res.status(500).send("Authentication failed");
  }
});

async function refreshAccessToken() {
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

    accessToken = response.data.access_token;
    if (response.data.refresh_token) {
      refreshToken = response.data.refresh_token;
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
  }
}

app.get("/api/current-track", async (req, res) => {
  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const response = await spotifyApi.get("/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
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
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await refreshAccessToken();
      return res
        .status(401)
        .json({ error: "Token refreshed, please try again" });
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
