const crypto = require("crypto");
const uuidv1 = require("uuid/v1");

class UserProfileTable {
	
	constructor (tns) {
		this.tns = tns;
	}

	async createTable () {
		let sql = `
		CREATE TABLE IF NOT EXISTS Users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT,
			password TEXT,
			email TEXT,
			dob TEXT,
			ref TEXT,
			verified INTEGER DEFAULT 0
		)`;

		await this.tns.run(sql);
	}

	async registerUser (username, password, email, dob, ref) {

		let sql = "INSERT INTO Users (username, password, email, dob, ref) VALUES (?, ?, ?, ?, ?)";
		let params = [username, password, email, dob, ref];

		return await this.tns.run(sql, params);
	}

	getUserViaLogin (username, password) {
		return this.tns.get(`SELECT * FROM Users
		INNER JOIN Profiles ON Profiles.userId = Users.id
		INNER JOIN UserLevels ON UserLevels.userId = Users.id
		WHERE username = ? AND password = ?`, [username, password]);
	}

	getUserViaId (id) {
		return this.tns.get(`SELECT * FROM Users WHERE id = ?`, [id]);
	}

	getAllWithUsername(username, search = false) {
		if (search) {
			return this.tns.all(`SELECT 
				UsersPublic.id, UsersPublic.username, UsersPublic.ref, points, 
				picture, description, classLevel, chatLevel, 
				adminLevel FROM UsersPublic
				INNER JOIN Users ON Users.id = UsersPublic.id
				WHERE UsersPublic.username LIKE "${username}%" AND Users.verified = 1;`);
		} else {
			return this.tns.all("SELECT * FROM Users WHERE username = ?", [username]);
		}
	}

	changeUserPassword (id, newPassword) {
		let sql = "UPDATE Users SET password = ? WHERE id = ?";
		let params = [newPassword, id, email];

		this.tns.run(sql, params);
	}

	changeUserEmail (id, newEmail) {
		let sql = "UPDATE Users SET email = ? WHERE id = ?";
		let params = [newEmail, id];

		this.tns.run(sql, params);
	}

	changeUserToken (id, newToken) {
		let sql = "UPDATE Users SET ref = ? WHERE id = ?";
		let params = [newToken, id];

		this.tns.run(sql, params);
	}

	changeVerifiedUser (id, newStatus = true) {
		let sql = "UPDATE Users SET verified = ? WHERE id = ?";
		let params = [(newStatus) ? 1 : 0, id];

		this.tns.run(sql, params);
	}

	deactivateUserAccount (username, password) {
		let sql = "DELETE FROM Users WHERE username = ? AND password = ?";
		let params = [username, password, email];

		this.tns.run(sql, params);
	}

	getFromUsername (username) {
		return this.tns.get("SELECT * FROM Users WHERE username = ?", [username]);
	}

}

module.exports = UserProfileTable;