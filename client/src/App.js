import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Minimize,
  Settings,
  X,
} from "lucide-react";
import { useColor } from "color-thief-react";
import Cookies from "js-cookie";

const PomodoroTimer = () => {
  // 상태 변수 초기화
  const [minutes, setMinutes] = useState(25); // 분
  const [seconds, setSeconds] = useState(0); // 초
  const [isActive, setIsActive] = useState(false); // 타이머 활성화 상태
  const [isBreak, setIsBreak] = useState(false); // 휴식 상태
  const [isFullscreen, setIsFullscreen] = useState(false); // 전체 화면 상태
  const [currentTrack, setCurrentTrack] = useState(null); // 현재 트랙
  const [accentColor, setAccentColor] = useState("#000"); // 강조 색상
  const [isAuthenticated, setIsAuthenticated] = useState(false); // 인증 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusTime, setFocusTime] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const timerRef = useRef(null); // 타이머 참조
  const gradientRef = useRef(null); // 그라디언트 참조
  const backgroundRef = useRef(null); // 배경 참조

  // 쿠키에서 설정 불러오기
  useEffect(() => {
    const savedFocusTime = Cookies.get("focusTime");
    const savedBreakTime = Cookies.get("breakTime");
    if (savedFocusTime) setFocusTime(parseInt(savedFocusTime));
    if (savedBreakTime) setBreakTime(parseInt(savedBreakTime));
  }, []);

  // 설정 저장 함수
  const saveSettings = () => {
    Cookies.set("focusTime", focusTime.toString(), { expires: 365 });
    Cookies.set("breakTime", breakTime.toString(), { expires: 365 });
    setMinutes(focusTime);
    setSeconds(0);
    setIsSettingsOpen(false);
  };

  function hexToRgb(hex) {
    // hex 컬러를 RGB로 변환
    const parsedHex = hex.replace("#", "");
    const r = parseInt(parsedHex.substring(0, 2), 16) / 255;
    const g = parseInt(parsedHex.substring(2, 4), 16) / 255;
    const b = parseInt(parsedHex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }

  function rgbToHex(r, g, b) {
    // RGB를 hex로 변환
    const toHex = (value) => {
      const hex = Math.round(value * 255)
        .toString(16)
        .padStart(2, "0");
      return hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function adjustBrightness(hex) {
    const { r, g, b } = hexToRgb(hex);
    const maxChannel = Math.max(r, g, b);

    if (maxChannel > 0.5) {
      const ratio = 0.5 / maxChannel;
      return rgbToHex(r * ratio, g * ratio, b * ratio);
    }

    return hex;
  }

  // 현재 트랙의 앨범 커버에서 주요 색상 가져오기
  const { data: dominantColor } = useColor(currentTrack?.albumCover, "hex", {
    crossOrigin: "anonymous",
  });

  // 주요 색상이 변경될 때 강조 색상 업데이트
  useEffect(() => {
    if (dominantColor) {
      if (isBreak) {
        setAccentColor(dominantColor);
      } else {
        const adjustedColor = adjustBrightness(dominantColor);
        setAccentColor(adjustedColor);
      }
    } else if (!currentTrack) {
      setAccentColor("#000");
    }
  }, [dominantColor, currentTrack]);

  // 휴식 시간 시 배경 변경
  useEffect(() => {
    if (isBreak) {
      setAccentColor(dominantColor);
    } else {
      const adjustedColor = adjustBrightness(accentColor);
      setAccentColor(adjustedColor);
    }
  }, [isBreak]);

  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(focusTime * 60);

  // 타이머 로직
  useEffect(() => {
    let animationFrameId;

    const updateTimer = () => {
      if (isActive) {
        const now = Date.now();
        const newElapsedTime = now - startTime + elapsedTime;
        const newTotalSeconds = Math.max(0, totalSeconds - Math.floor(newElapsedTime / 1000));

        setMinutes(Math.floor(newTotalSeconds / 60));
        setSeconds(newTotalSeconds % 60);

        if (newTotalSeconds <= 0) {
          setIsActive(false);
          setIsBreak((prevIsBreak) => !prevIsBreak);
          const newDuration = isBreak ? focusTime : breakTime;
          setTotalSeconds(newDuration * 60);
          setElapsedTime(0);
          setStartTime(null);
        } else {
          animationFrameId = requestAnimationFrame(updateTimer);
        }
      }
    };

    if (isActive && startTime === null) {
      setStartTime(Date.now());
    }

    if (isActive) {
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, startTime, elapsedTime, totalSeconds, isBreak, focusTime, breakTime]);

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
    if (isBreak) {
      console.log(accentColor);
      if (gradientRef.current && backgroundRef.current) {
        gradientRef.current.style.backgroundImage = ``;
        gradientRef.current.style.backgroundColor = accentColor;
        gradientRef.current.style.opacity = 1;
        setTimeout(() => {
          backgroundRef.current.style.backgroundImage = ``;
          backgroundRef.current.style.backgroundColor = accentColor;
          gradientRef.current.style.opacity = 0;
        }, 500);
      }
    } else {
      if (gradientRef.current && backgroundRef.current) {
        gradientRef.current.style.backgroundColor = ``;
        gradientRef.current.style.backgroundImage = `linear-gradient(0deg, ${accentColor} 0%, #000 70%)`;
        gradientRef.current.style.opacity = 1;
        setTimeout(() => {
          backgroundRef.current.style.backgroundColor = ``;
          backgroundRef.current.style.backgroundImage = `linear-gradient(0deg, ${accentColor} 0%, #000 70%)`;
          gradientRef.current.style.opacity = 0;
        }, 500);
      }
    }
  }, [accentColor]);

  // 로그인 핸들러
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  // 설정 버튼 핸들러
  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const toggleTimer = () => {
    if (!isActive) {
      setStartTime(Date.now());
      setIsActive(true);
    } else {
      setElapsedTime((prevElapsedTime) => prevElapsedTime + (Date.now() - startTime));
      setStartTime(null);
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(focusTime);
    setSeconds(0);
    setIsBreak(false);
    setElapsedTime(0);
    setStartTime(null);
    setTotalSeconds(focusTime * 60);
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
    return yiq >= 128 ? false : true;
  };

  const textColor = isBreak
    ? getContrastColor(accentColor)
      ? "#ffffff"
      : "#000"
    : "#ffffff";

  // 스타일 객체 정의
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: accentColor,
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
    color: isBreak ? accentColor : "#000",
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
    justifyContent: "center",
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
    maxWidth: "60vw",
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
    filter: isBreak ? (getContrastColor(accentColor) ? "" : "invert(1)") : "",
  };

  const ellipsis = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%",
  };

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    opacity: isSettingsOpen ? 1 : 0,
    visibility: isSettingsOpen ? "visible" : "hidden",
    transition: "opacity 0.3s ease, visibility 0.3s ease",
  };

  const modalStyle = {
    backgroundColor: isBreak ? accentColor : "#000",
    color: textColor,
    padding: "2rem",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "400px",
    width: "90%",
    transform: isSettingsOpen ? "scale(1)" : "scale(0.9)",
    opacity: isSettingsOpen ? 1 : 0,
    transition: "transform 0.3s ease, opacity 0.3s ease",
  };

  const inputContainerStyle = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    marginBottom: "1rem",
  };

  const labelStyle = {
    marginBottom: "0.5rem",
    fontSize: "1rem",
    fontWeight: "bold",
  };

  const inputStyle = {
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    fontSize: "1rem",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: textColor,
  };

  const saveButtonStyle = {
    ...buttonStyle,
    width: "100%",
    height: "auto",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "bold",
    marginTop: "1rem",
  };

  const closeButtonStyle = {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "none",
    border: "none",
    color: textColor,
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
            <button onClick={toggleSettings} style={buttonStyle}>
              <Settings size={24} />
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
                    ...ellipsis,
                    fontSize: "1.5rem",
                    marginBottom: "0.5rem",
                    marginTop: "0",
                  }}
                >
                  {currentTrack.title}
                </h2>
                <p
                  style={{
                    ...ellipsis,
                    fontSize: "1rem",
                    opacity: 0.8,
                    marginTop: "0",
                  }}
                >
                  {currentTrack.artist}
                </p>
              </div>
              <div style={overlayStyle}>
                <div style={modalStyle}>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    style={closeButtonStyle}
                  >
                    <X size={24} />
                  </button>
                  <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem" }}>
                    Settings
                  </h2>
                  <div style={inputContainerStyle}>
                    <label style={labelStyle}>Focus Time (minutes):</label>
                    <input
                      type="number"
                      value={focusTime}
                      onChange={(e) => setFocusTime(parseInt(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={inputContainerStyle}>
                    <label style={labelStyle}>Break Time (minutes):</label>
                    <input
                      type="number"
                      value={breakTime}
                      onChange={(e) => setBreakTime(parseInt(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                  <button onClick={saveSettings} style={saveButtonStyle}>
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PomodoroTimer;
