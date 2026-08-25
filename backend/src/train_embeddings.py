"""
Batch compute 128-d SFace embeddings for multiple face images.
Reads JSON from stdin with { "face_images": ["base64_img1", ...] }
Outputs JSON array of embedding vectors (or null for failed detections).
"""
import sys
import json
import os

cur_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, cur_dir)
sys.path.insert(0, os.path.abspath(os.path.join(cur_dir, "..")))

from face_verifier import face_verifier


def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"embeddings": [], "error": "No input data provided."}))
            return

        payload = json.loads(input_data)
        face_images = payload.get("face_images", [])

        if not face_images or not isinstance(face_images, list):
            print(json.dumps({"embeddings": [], "error": "face_images array is required."}))
            return

        embeddings = []
        successful = 0

        for idx, img_b64 in enumerate(face_images):
            try:
                img = face_verifier.decode_base64_image(img_b64)
                if img is None:
                    embeddings.append(None)
                    print(f"[TrainEmbeddings] Image {idx+1}: Failed to decode.", file=sys.stderr)
                    continue

                ok, feature = face_verifier._extract_face_embedding(img)
                if ok and feature is not None:
                    # Convert numpy array to list for JSON serialization
                    emb_list = feature.flatten().tolist()
                    embeddings.append(emb_list)
                    successful += 1
                    print(f"[TrainEmbeddings] Image {idx+1}: Embedding extracted (128-d).", file=sys.stderr)
                else:
                    embeddings.append(None)
                    print(f"[TrainEmbeddings] Image {idx+1}: No face detected.", file=sys.stderr)
            except Exception as e:
                embeddings.append(None)
                print(f"[TrainEmbeddings] Image {idx+1} error: {e}", file=sys.stderr)

        print(json.dumps({
            "embeddings": embeddings,
            "total": len(face_images),
            "successful": successful,
        }))

    except Exception as e:
        print(json.dumps({
            "embeddings": [],
            "error": f"Embedding computation error: {str(e)}",
        }))


if __name__ == "__main__":
    main()
