from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import datetime
import bcrypt # Assuming you use bcrypt for password security

app = Flask(__name__)

# 1. Configuration
# Enable CORS so your frontend (on port 5500/8080) can talk to this API
CORS(app) 

# Change 'habitTrackerDB' to 'main_DB' if that is your target database
app.config["MONGO_URI"] = "mongodb://localhost:27017/main_DB"
mongo = PyMongo(app)

# 2. Migration Endpoint (Upsert Logic)
@app.route('/api/migrate', methods=['POST'])
def migrate_data():
    data = request.json
    email = data.get("email")
    
    if not email:
        return jsonify({"message": "Email required"}), 400

    # Upsert: Update if exists, Insert if not
    mongo.db.user_data.update_one(
        {"email": email},
        {"$set": {
            "habits": data.get("habits"),
            "progressData": data.get("progressData"),
            "dailyNotes": data.get("dailyNotes"),
            "metadata": {
                "lastSynced": datetime.utcnow(),
                "timezone": data.get("timezone", "UTC")
            }
        }},
        upsert=True
    )
    return jsonify({"message": "Cloud Sync Complete", "status": "success"}), 200

# 3. Registration Route (for testing/completeness)


# 4. Updated Login Route
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    # Verify user exists in primary user collection
    user = mongo.db.users.find_one({"email": email})
    
    if not user or user['password'] != password:
        return jsonify({"message": "Invalid email or password"}), 401
    
    # Fetch user-specific habit/note data from the 'user_data' collection
    user_cloud_data = mongo.db.user_data.find_one({"email": email})
    
    # Construct the response with cloud data for the dashboard
    return jsonify({
        "message": "Login successful",
        "user_email": email,
        "firstname": user.get('firstname', 'Guest'),
        "lastname": user.get('lastname', 'User'),
        "cloudData": {
            "habits": user_cloud_data.get("habits", []) if user_cloud_data else [],
            "progressData": user_cloud_data.get("progressData", {}) if user_cloud_data else {},
            "dailyNotes": user_cloud_data.get("dailyNotes", {}) if user_cloud_data else {}
        }
    }), 200
    
    
    # 3. Registration Route
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    firstname = data.get("firstname", "Guest")
    lastname = data.get("lastname", "User")
    bday = data.get("bday")
    phnum = data.get("phnum")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    # Check if user already exists
    existing_user = mongo.db.users.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "User already exists"}), 409

    # Insert new user into the 'users' collection
    mongo.db.users.insert_one({
        "firstname": firstname,
        "lastname": lastname,
        "email": email,
        "password": password,  # Note: In production, use bcrypt to hash this!
        "birthday":bday,
        "phonenumber":phnum,
        "created_at": datetime.utcnow()
    })

    return jsonify({"message": "Registration successful", "status": "success"}), 201

# 5. Entry Point - This keeps the server running
if __name__ == '__main__':
    print("--- Habit Tracker Backend Running ---")
    print("URL: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)