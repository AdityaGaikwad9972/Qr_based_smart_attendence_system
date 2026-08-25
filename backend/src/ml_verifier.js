const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_PATH = path.resolve(__dirname, "verify_face.py");

/**
 * Execute YuNet + SFace ONNX deep neural network face verification with Anti-Spoofing
 * @param {string} registeredB64 - Enrolled student face image base64
 * @param {string} liveSelfieB64 - Live webcam selfie base64
 * @param {Object} options - Optional burst_frames and liveness_challenge data
 * @returns {Promise<Object>} Verification outcome with confidence score & percentage
 */
function verifyFaces(registeredB64, liveSelfieB64, options = {}) {
  return new Promise((resolve) => {
    if (!registeredB64) {
      return resolve({
        verified: false,
        is_live: false,
        match_score: 0.0,
        match_percentage: 0.0,
        status: "missing_registered_photo",
        message: "No registered face photo found in database. Please enroll your face first.",
        registered_face_detected: false,
        live_face_detected: false,
      });
    }

    if (!liveSelfieB64) {
      return resolve({
        verified: false,
        is_live: false,
        match_score: 0.0,
        match_percentage: 0.0,
        status: "missing_live_selfie",
        message: "Live selfie photo is required for biometric verification.",
        registered_face_detected: false,
        live_face_detected: false,
      });
    }

    const pythonProcess = spawn("python", [SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0 && !stdoutData.trim()) {
        console.warn(`[ML Verifier] Python process exited with code ${code}:`, stderrData);
        return resolve({
          verified: false,
          is_live: false,
          match_score: 0.0,
          match_percentage: 0.0,
          status: "inference_failed",
          message: "Unable to process biometric model. Please retry selfie capture.",
          registered_face_detected: false,
          live_face_detected: false,
        });
      }

      try {
        // Extract JSON from output (filter out any OpenCV warnings)
        const jsonStart = stdoutData.indexOf("{");
        const jsonEnd = stdoutData.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = stdoutData.substring(jsonStart, jsonEnd + 1);
          const result = JSON.parse(jsonStr);
          return resolve(result);
        } else {
          throw new Error("No JSON in output");
        }
      } catch (err) {
        console.warn("[ML Verifier] Output parse warning:", err.message, stdoutData);
        return resolve({
          verified: false,
          is_live: false,
          match_score: 0.0,
          match_percentage: 0.0,
          status: "parse_error",
          message: "Biometric analysis could not be completed. Please retake the live photo.",
          registered_face_detected: false,
          live_face_detected: false,
        });
      }
    });

    pythonProcess.on("error", (err) => {
      console.warn("[ML Verifier] Failed to spawn Python process:", err.message);
      return resolve({
        verified: false,
        is_live: false,
        match_score: 0.0,
        match_percentage: 0.0,
        status: "service_unavailable",
        message: "Biometric verification service error: " + err.message,
        registered_face_detected: false,
        live_face_detected: false,
      });
    });

    // Send payload via stdin and close
    const payload = JSON.stringify({
      registered_b64: registeredB64,
      live_selfie_b64: liveSelfieB64,
      burst_frames: options.burst_frames || [],
      liveness_challenge: options.liveness_challenge || null,
      registered_embeddings: options.registered_embeddings || null,
    });

    pythonProcess.stdin.write(payload);
    pythonProcess.stdin.end();
  });
}

const TRAIN_SCRIPT_PATH = path.resolve(__dirname, "train_embeddings.py");

/**
 * Batch compute 128-d SFace embeddings for multiple face images
 * @param {string[]} faceImages - Array of base64 face image strings
 * @returns {Promise<Object>} { embeddings: [...], total, successful }
 */
function computeEmbeddings(faceImages) {
  return new Promise((resolve) => {
    if (!faceImages || !Array.isArray(faceImages) || faceImages.length === 0) {
      return resolve({ embeddings: [], total: 0, successful: 0 });
    }

    const pythonProcess = spawn("python", [TRAIN_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (stderrData) {
        console.log("[ML Embeddings] Python logs:", stderrData.trim());
      }

      if (code !== 0 && !stdoutData.trim()) {
        console.warn(`[ML Embeddings] Python process exited with code ${code}`);
        return resolve({ embeddings: [], total: faceImages.length, successful: 0, error: "Embedding computation failed" });
      }

      try {
        const jsonStart = stdoutData.indexOf("{");
        const jsonEnd = stdoutData.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = stdoutData.substring(jsonStart, jsonEnd + 1);
          const result = JSON.parse(jsonStr);
          return resolve(result);
        } else {
          throw new Error("No JSON in output");
        }
      } catch (err) {
        console.warn("[ML Embeddings] Output parse warning:", err.message);
        return resolve({ embeddings: [], total: faceImages.length, successful: 0, error: "Parse error" });
      }
    });

    pythonProcess.on("error", (err) => {
      console.warn("[ML Embeddings] Failed to spawn Python process:", err.message);
      return resolve({ embeddings: [], total: faceImages.length, successful: 0, error: err.message });
    });

    const payload = JSON.stringify({ face_images: faceImages });
    pythonProcess.stdin.write(payload);
    pythonProcess.stdin.end();
  });
}

module.exports = {
  verifyFaces,
  computeEmbeddings,
};
