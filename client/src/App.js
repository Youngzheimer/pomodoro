import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Maximize, Minimize } from "lucide-react";
import { useColor } from "color-thief-react";

const PomodoroTimer = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accentColor, setAccentColor] = useState("#121212");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const timerRef = useRef(null);

  const { data: dominantColor } = useColor(currentTrack?.albumCover, "hex", {
    crossOrigin: "anonymous",
  });

  useEffect(() => {
    if (dominantColor) {
      setAccentColor(dominantColor);
    } else if (!currentTrack) {
      setAccentColor("#121212");
    }
  }, [dominantColor, currentTrack]);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          clearInterval(interval);
          setIsBreak(!isBreak);
          setMinutes(isBreak ? 25 : 5);
          setSeconds(0);
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, isBreak]);

  useEffect(() => {
    const fetchCurrentTrack = async () => {
      try {
        const response = await fetch("/api/current-track");
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data.isPlaying) {
          setCurrentTrack(data);
        } else {
          setCurrentTrack(null);
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error fetching current track:", error);
      }
    };
    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
    setIsBreak(false);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (timerRef.current.requestFullscreen) {
        timerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const getContrastColor = (hexcolor) => {
    if (!hexcolor) return "#ffffff";
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
  };

  const textColor = isBreak ? getContrastColor(accentColor) : "#ffffff";

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: isBreak
      ? accentColor
      : `linear-gradient(0deg, ${accentColor} 0%, #000 70%)`,
    color: textColor,
    backgroundSize: "200% 200%",
  };

  const timerStyle = {
    fontSize: "8rem",
    marginBottom: "2rem",
    fontWeight: "bold",
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "1rem",
  };

  const buttonStyle = {
    backgroundColor: textColor,
    color: isBreak ? accentColor : "#121212",
    border: "none",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  };

  const trackInfoStyle = {
    display: "flex",
    alignItems: "center",
    position: "absolute",
    bottom: "50px",
    transition: "opacity 0.5s ease",
  };

  const albumCoverStyle = {
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "10px",
    marginRight: "1rem",
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.3)",
  };

  const trackTextStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    transition: "opacity 0.5s ease",
  };

  const clockStyle = {
    position: "absolute",
    top: "20px",
    fontSize: "1.2rem",
    color: textColor,
  };

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const intervalId = setInterval(updateClock, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div ref={timerRef} style={containerStyle}>
      {!isAuthenticated ? (
        <button onClick={handleLogin} style={buttonStyle}>
          Login with Spotify
        </button>
      ) : (
        <>
          <div style={clockStyle}>{currentTime}</div>
          <div style={timerStyle}>
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
          <div style={buttonContainerStyle}>
            <button onClick={toggleTimer} style={buttonStyle}>
              {isActive ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button onClick={resetTimer} style={buttonStyle}>
              <RotateCcw size={24} />
            </button>
            <button onClick={toggleFullscreen} style={buttonStyle}>
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
          </div>
          {currentTrack && (
            <div style={trackInfoStyle}>
              <img
                src={currentTrack.albumCover}
                alt="Album Cover"
                style={albumCoverStyle}
              />
              <div style={trackTextStyle}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                  {currentTrack.title}
                </h2>
                <p style={{ fontSize: "1rem", opacity: 0.8 }}>
                  {currentTrack.artist}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PomodoroTimer;
