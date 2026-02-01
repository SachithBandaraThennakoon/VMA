import React, { useRef, useEffect } from "react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { calculateAngle, calculateDistance } from "../utils/poseMath";

export default function PoseCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (!results.poseLandmarks) return;

      const lm = results.poseLandmarks;

      // Key landmarks
      const leftHip = lm[23];
      const leftKnee = lm[25];
      const leftAnkle = lm[27];

      const rightHip = lm[24];
      const rightKnee = lm[26];
      const rightAnkle = lm[28];

      const leftWrist = lm[15];
      const rightWrist = lm[16];
      const nose = lm[0];

      // Calculations
      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      const stanceWidth = calculateDistance(leftAnkle, rightAnkle);

      const handsUp =
        leftWrist.y < nose.y &&
        rightWrist.y < nose.y;

      const centerX = (leftHip.x + rightHip.x) / 2;
      const footCenterX = (leftAnkle.x + rightAnkle.x) / 2;
      const balanced = Math.abs(centerX - footCenterX) < 0.05;

      // Debug (temporary)
      console.log({
        leftKneeAngle: leftKneeAngle.toFixed(1),
        rightKneeAngle: rightKneeAngle.toFixed(1),
        stanceWidth: stanceWidth.toFixed(3),
        handsUp,
        balanced,
      });

      // Draw skeleton
      drawConnectors(ctx, lm, POSE_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 4,
      });

      drawLandmarks(ctx, lm, {
        color: "#FF0000",
        lineWidth: 2,
      });
    });

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await pose.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return (
    <div style={{ position: "relative", width: 640 }}>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ border: "2px solid black" }}
      />
    </div>
  );
}
