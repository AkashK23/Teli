from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from flask_cors import CORS

app = Flask(__name__)

CORS(app)


# Load Firebase credentials
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()

@app.route("/")
def hello():
    return jsonify({"message": "Hello from Flask!"})

@app.route("/add_user", methods=["POST"])
def add_user():
    data = request.json  # Get data from request body
    user_ref = db.collection("users").add(data)  # Add data to Firestore
    return jsonify({"message": "User added successfully!", "id": user_ref[1].id})

@app.route('/get_users', methods=['GET'])
def get_users():
    try:
        users_ref = db.collection('users')
        docs = users_ref.stream()

        users_list = []
        for doc in docs:
            user_data = doc.to_dict()
            user_data["id"] = doc.id  # Include the document ID
            users_list.append(user_data)

        return jsonify(users_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
