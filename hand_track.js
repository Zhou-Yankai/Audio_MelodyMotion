document.addEventListener('DOMContentLoaded', () => {
  const videoElement = document.getElementById('webcam');
  const canvasElement = document.getElementById('output_canvas');
  const canvasCtx = canvasElement.getContext('2d');
  const delay = 5000
  let hands; // 用于存储MediaPipe Hands实例
  let globalStream = null; // 用于存储全局媒体流对象
  let isMirrored = false;//追踪镜像状态

  function onCameraStart() {
    // 调整 canvas 尺寸以匹配视频流尺寸
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // 初始化 MediaPipe 手部追踪
    hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });


    function outputMax(mess) {
      window.max.outlet(mess);
    }
    
    function outputMaxDict(dstr) {
      window.max.outlet("dictionary", dstr);
    }
    
    function setMaxDict(d) {
      window.max.setDict('hands_landmarkdict', d);
    }


    // hands.onResults((results) => {
    //   canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    //   // const indexTip = {};
    //   if (results.multiHandLandmarks) {
    //     for (landmarks of results.multiHandLandmarks) {
    //       window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
    //       window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });

    //       const indexTip = landmarks[8];
    //       console.log(indexTip);
    //     }
    //   }
    //   // setMaxDict(indexTip);
    //   outputMax("update");
    // });



    hands.onResults((results) => {
      try {
        max.outlet("onResults called");
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
        if (results.multiHandLandmarks && results.multiHandedness) {
          let leftIndexTip = { x: 0, y: 0, z: 0 };
          let rightIndexTip = { x: 0, y: 0, z: 0 };
    
          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label; // "Left" or "Right"
            
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
            window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
    
            // 获取食指指尖的坐标
            const indexTip = landmarks[8];
    
            // 根据手的类型（左手或右手），存储食指指尖的坐标
            if (handedness === 'Left') {
              leftIndexTip = indexTip;
            } else if (handedness === 'Right') {
              rightIndexTip = indexTip;
            }
          }
    
          // 输出左右手的食指指尖坐标
          window.max.outlet("leftIndexTip", leftIndexTip.x, leftIndexTip.y, leftIndexTip.z);
          window.max.outlet("rightIndexTip", rightIndexTip.x, rightIndexTip.y, rightIndexTip.z);
    
          window.max.outlet("update");
        } 
      } catch (error) {
        max.outlet(0, "Error:", error.message);
      }
    });


    const camera = new window.Camera(videoElement, {
      onFrame: async () => {
        await hands.send({image: videoElement});
      },
      width: 640,
      height: 480
    });
    camera.start();
  }

  window.getMediaStream = function() {
    console.log('Trying to get media stream');
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          globalStream = stream;
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            onCameraStart();
          };
        })
        .catch((error) => {
          console.error('Error accessing the camera:', error);
        });
    } else {
      console.error('getUserMedia() is not supported by your browser');
    }
  }

  window.releaseMediaStream = function() {
    console.log('Trying to release media stream');
    if (globalStream) {
      globalStream.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
      globalStream = null;
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // 清除canvas
    }
  }



  function toggleMirror() {
    isMirrored = !isMirrored; // 切换状态
    const transformValue = isMirrored ? "scaleX(-1)" : "scaleX(1)";
    webcam.style.transform = transformValue;
    output_canvas.style.transform = transformValue;
  }

  // 绑定到 Max 的 inlet，这次我们使用一个切换函数
  window.max.bindInlet('toggle_mirror', () => {
    toggleMirror();
  });
  window.max.bindInlet('get_MediaStream', () => {
    getMediaStream();
  });
  window.max.bindInlet('release_MediaStream', () => {
    releaseMediaStream();
  });


  


  // 默认尝试获取媒体流
  getMediaStream();
  // setTimeout(releaseMediaStream, delay);
});