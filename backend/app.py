from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from flask_cors import CORS
from pydantic import BaseModel, EmailStr, ValidationError
from werkzeug.exceptions import BadRequest

app = Flask(__name__)

CORS(app)


# Load Firebase credentials
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()

@app.route("/")
def hello():
    return jsonify({"message": "Hello from Teli!"})

class AddUserRequest(BaseModel):
    name: str
    email: EmailStr

@app.route("/add_user", methods=["POST"])
def add_user():
    try:
        # Validate and parse request
        req_data = AddUserRequest.model_validate(request.get_json())
    except ValidationError as e:
        # If validation fails, return 400 with error details
        return jsonify({"errors": e.errors()}), 400

    # Now safe to use validated data
    user_data = req_data.model_dump()
    print(user_data)
    user_ref = db.collection("users").add(user_data)
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
    app.run(port=5001, debug=True)
