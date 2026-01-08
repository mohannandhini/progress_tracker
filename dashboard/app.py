from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import date

app = Flask(__name__)
CORS(app)   # VERY IMPORTANT

client = MongoClient("mongodb://localhost:27017/")
db = client["habit_iq"]
habits_col = db["habits"]
logs_col = db["habit_logs"]

# ---------- ADD HABIT ----------
@app.route("/habits", methods=["POST"])
def add_habit():
    data = request.json
    habits_col.insert_one({
        "title": data["title"],
        "createdAt": date.today().isoformat()
    })
    return jsonify({"message": "Habit added"}), 201

# ---------- GET HABITS ----------
@app.route("/habits", methods=["GET"])
def get_habits():
    return jsonify([
        {"_id": str(h["_id"]), "title": h["title"]}
        for h in habits_col.find()
    ])

# ---------- DELETE HABIT ----------
@app.route("/habits/<habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    habits_col.delete_one({"_id": ObjectId(habit_id)})
    logs_col.delete_many({"habitId": ObjectId(habit_id)})
    return jsonify({"message": "Deleted"})

# ---------- TOGGLE HABIT ----------
@app.route("/toggle", methods=["POST"])
def toggle_habit():
    data = request.json
    habit_id = ObjectId(data["habitId"])
    today = date.today().isoformat()

    log = logs_col.find_one({"habitId": habit_id, "date": today})

    if log:
        logs_col.update_one(
            {"_id": log["_id"]},
            {"$set": {"status": not log["status"]}}
        )
    else:
        logs_col.insert_one({
            "habitId": habit_id,
            "date": today,
            "status": True
        })

    return jsonify({"message": "Updated"})

# ---------- PROGRESS ----------
@app.route("/progress", methods=["GET"])
def progress():
    today = date.today().isoformat()
    total = habits_col.count_documents({})
    completed = logs_col.count_documents({
        "date": today,
        "status": True
    })

    percent = int((completed / total) * 100) if total else 0
    return jsonify({
        "completed": completed,
        "total": total,
        "percentage": percent
    })

if __name__ == "__main__":
    app.run(debug=True)
