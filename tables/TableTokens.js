const uuidv1 = require("uuid/v1");

class TokenTable {
	
	constructor (tns) {
		this.tns = tns;
	}

	async createTable () {
		let sql = `
		CREATE TABLE IF NOT EXISTS Tokens (
			token TEXT,
			userId INT,
			expiry INT,
			FOREIGN KEY (userId) REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
			UNIQUE (userId) ON CONFLICT REPLACE
		);`;
		await this.tns.run(sql);
	}

	async createToken (userId) {
		try {
			let expiry = new Date(new Date().getTime() + 60 * 60 * 24 * 1000);

			let sql = "INSERT INTO Tokens (token, userId, expiry) VALUES (?, ?, ?)";
			let token = uuidv1();
			let params = [token, userId, expiry.getTime()];
		
			await this.tns.run("DELETE FROM Tokens WHERE userId = ?", [userId]);
			await this.tns.run(sql, params);
			//console.log(token);
			return token;
		} catch (e) {
			console.log(e);
			return "error";
		}
	}

	getUser (token) {
		let sql = `SELECT * FROM Tokens 
		INNER JOIN Users ON Tokens.userId = Users.id 
		INNER JOIN Profiles ON Tokens.userId = Profiles.userId
		INNER JOIN UserLevels ON Tokens.userId = UserLevels.userId
		WHERE token = ?`;
		return this.tns.get(sql, [token]);
	}

	deleteToken (token) {
		let sql = "DELETE FROM Tokens WHERE token = ?"
		this.tns.run(sql, [token]);
	}
}

module.exports = TokenTable;