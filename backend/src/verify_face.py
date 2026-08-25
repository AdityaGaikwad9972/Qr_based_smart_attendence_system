import sys
import json
import os

# Add src path to locate face_verifier
cur_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, cur_dir)
sys.path.insert(0, os.path.abspath(os.path.join(cur_dir, "..")))

from face_verifier import face_verifier


def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({
                "verified": False,
                "match_score": 0.0,
                "match_percentage": 0.0,
                "status": "empty_input",
                "message": "No photo data provided."
            }))
            return

        payload = json.loads(input_data)
        registered_b64 = payload.get("registered_b64") or payload.get("registered_face")
        live_selfie_b64 = payload.get("live_selfie_b64") or payload.get("selfie_image")
        burst_frames = payload.get("burst_frames") or payload.get("burst_images")
        liveness_challenge = payload.get("liveness_challenge") or payload.get("liveness_data")
        registered_embeddings = payload.get("registered_embeddings")

        # Use multi-embedding verification if embeddings are provided
        if registered_embeddings and isinstance(registered_embeddings, list) and len(registered_embeddings) > 0:
            result = face_verifier.verify_faces_multi(
                registered_embeddings,
                live_selfie_b64,
                registered_face_b64=registered_b64,
                burst_frames=burst_frames,
                liveness_challenge=liveness_challenge,
            )
        else:
            result = face_verifier.verify_faces(
                registered_b64,
                live_selfie_b64,
                burst_frames=burst_frames,
                liveness_challenge=liveness_challenge,
            )

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "verified": False,
            "match_score": 0.0,
            "match_percentage": 0.0,
            "status": "error",
            "message": f"ML face verification error: {str(e)}"
        }))


if __name__ == "__main__":
    main()
