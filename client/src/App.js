import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Maximize, Minimize } from "lucide-react";
import { useColor } from "color-thief-react";

const PomodoroTimer = () => {
  // 상태 변수 초기화
  const [minutes, setMinutes] = useState(25); // 분
  const [seconds, setSeconds] = useState(0); // 초
  const [isActive, setIsActive] = useState(false); // 타이머 활성화 상태
  const [isBreak, setIsBreak] = useState(false); // 휴식 상태
  const [isFullscreen, setIsFullscreen] = useState(false); // 전체 화면 상태
  const [currentTrack, setCurrentTrack] = useState(null); // 현재 트랙
  const [accentColor, setAccentColor] = useState("#121212"); // 강조 색상
  const [isAuthenticated, setIsAuthenticated] = useState(false); // 인증 상태
  const timerRef = useRef(null); // 타이머 참조
  const gradientRef = useRef(null); // 그라디언트 참조
  const backgroundRef = useRef(null); // 배경 참조

  // 현재 트랙의 앨범 커버에서 주요 색상 가져오기
  const { data: dominantColor } = useColor(currentTrack?.albumCover, "hex", {
    crossOrigin: "anonymous",
  });

  // 주요 색상이 변경될 때 강조 색상 업데이트
  useEffect(() => {
    if (dominantColor) {
      setAccentColor(dominantColor);
    } else if (!currentTrack) {
      setAccentColor("#121212");
    }
  }, [dominantColor, currentTrack]);

  // 타이머 로직
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

  // 현재 트랙 정보 가져오기
  useEffect(() => {
    const fetchCurrentTrack = async () => {
      try {
        const response = await fetch("/api/current-track", {
          credentials: "include",
        });
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data.isPlaying) {
          console.log(data);
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

  // 강조 색상에 따라 그라디언트 스타일 업데이트
  useEffect(() => {
    if (gradientRef.current && backgroundRef.current) {
      gradientRef.current.style.backgroundImage = `linear-gradient(0deg, ${accentColor} 0%, #000 70%)`;
      gradientRef.current.style.opacity = 1;
      setTimeout(() => {
        backgroundRef.current.style.backgroundImage = `linear-gradient(0deg, ${accentColor} 0%, #000 70%)`;
        gradientRef.current.style.opacity = 0;
      }, 500);
    }
  }, [accentColor]);

  // 로그인 핸들러
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  // 타이머 토글 핸들러
  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  // 타이머 리셋 핸들러
  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
    setIsBreak(false);
  };

  // 전체 화면 토글 핸들러
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

  // 대비 색상 계산 함수
  const getContrastColor = (hexcolor) => {
    if (!hexcolor) return "#ffffff";
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
  };

  const textColor = "#ffffff"; // 텍스트 색상 결정

  // 스타일 객체 정의
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    color: textColor,
    position: "relative",
    overflow: "hidden",
  };

  const backgroundStyle = {
    display: isAuthenticated ? "block" : "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: ``,
    opacity: 1,
  };

  const gradientStyle = {
    display: isAuthenticated ? "block" : "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: ``,
    opacity: 1,
    transition: "opacity 0.5s ease",
  };

  const timerStyle = {
    fontSize: "8rem",
    marginBottom: "2rem",
    fontWeight: "bold",
    zIndex: 1,
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "1rem",
    zIndex: 1,
  };

  const buttonStyle = {
    backgroundColor: textColor,
    color: "#121212",
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
    zIndex: 1,
  };

  const albumCoverStyle = {
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "4px",
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
    zIndex: 1,
  };

  const loginButtonStyle = {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#1DB954",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "24px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  };

  const spotifyLogoStyle = {
    width: "24px",
    height: "24px",
    marginRight: "12px",
  };

  const spotifyLogoTextStyle = {
    height: "24px",
    marginBottom: "12px",
    marginTop: "4px",
    cursor: "pointer",
  };

  const [currentTime, setCurrentTime] = useState(""); // 현재 시간 상태
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const intervalId = setInterval(updateClock, 1000); // 매초 현재 시간 업데이트
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div ref={timerRef} style={containerStyle}>
      <div ref={backgroundRef} style={backgroundStyle}></div>
      <div ref={gradientRef} style={gradientStyle}></div>
      {!isAuthenticated ? (
        <button onClick={handleLogin} style={loginButtonStyle}>
          <img
            src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_White.png"
            alt="Spotify Logo"
            style={spotifyLogoStyle}
            onClick={handleLogin}
          />
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
                <a href={currentTrack.link} target="_blank">
                  <img
                    src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Full_Logo_RGB_White.png"
                    alt="Spotify Link"
                    style={spotifyLogoTextStyle}
                    onClick={() => {
                      window.open(currentTrack.link, "_blank");
                      console.log(currentTrack.link);
                    }}
                  />
                </a>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "0.5rem",
                    marginTop: "0",
                  }}
                >
                  {currentTrack.title}
                </h2>
                <p
                  style={{
                    fontSize: "1rem",
                    opacity: 0.8,
                    marginTop: "0",
                  }}
                >
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
