const crypto = require("crypto");
const uuidv1 = require("uuidv1");

class UserProfileTable {
	
	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		let sql = `
		CREATE TABLE IF NOT EXISTS Users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT,
			password TEXT,
			email TEXT,
			dob TEXT,
			ref TEXT
		)
		`;

		this.tns.run(sql);
	}

	async registerUser (username, password, email, dob, ref) {

		let sql = "INSERT INTO Users (username, password, email, dob, ref) VALUES (?, ?, ?, ?, ?)";
		let params = [username, password, email, dob, ref];

		return await this.tns.run(sql, params);
	}

	getUserViaLogin (username, password) {
		return this.tns.get("SELECT * FROM Users WHERE username = ? AND password = ?", [username, password]);
	}

	getUserViaId (id) {
		return this.tns.get("SELECT * FROM Users WHERE id = ?", [id]);
	}

	changeUserPassword (username, email, newPassword) {
		let sql = "UPDATE Users SET password = ? WHERE username = ? AND email = ?";
		let params = [newPassword, username, email];

		this.tns.run(sql, params);
	}

	deactivateUserAccount (username, password) {
		let sql = "DELETE FROM Users WHERE username = ? AND password = ?";
		let params = [username, password, email];

		this.tns.run(sql, params);
	}

}

module.exports = UserProfileTable;