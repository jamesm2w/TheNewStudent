const uuidv1 = require("uuid/v1");

class TokenTable {
	
	constructor (tns) {
		this.tns = tns;
	}

	async createTable () {
		let sql = `
		CREATE TABLE IF NOT EXISTS Tokens (
			token TEXT,
			userId INT UNIQUE ON CONFLICT REPLACE,
			expiry INT,
			FOREIGN KEY (userId) REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
		);`;
		await this.tns.run(sql);
	}

	async createToken (userId) {
		try {
			let expiry = new Date(new Date().getTime() + 60 * 60 * 24 * 1000);

			let sql = "INSERT INTO Tokens (token, userId, expiry) VALUES (?, ?, ?)";
			let token = uuidv1();
			let params = [token, userId, expiry.getTime()];
		
			//await this.tns.run("DELETE FROM Tokens WHERE userId = ?", [userId]);
			await this.tns.run(sql, params);
			console.log(await this.tns.all("SELECT * FROM Tokens"));
			//console.log(token);
			return token;
		} catch (e) {
			console.log(e);
			return "error";
		}
	}

	async getUser (token) {
		//console.log(await this.tns.all("SELECT * FROM Tokens"));
		let sql = `SELECT * FROM Tokens 
		INNER JOIN Users ON Tokens.userId = Users.id 
		INNER JOIN Profiles ON Tokens.userId = Profiles.userId
		INNER JOIN UserLevels ON Tokens.userId = UserLevels.userId
		WHERE token = ?`;
		let t = await this.tns.get(sql, [token]);

		if (typeof t != "undefined" && t.expiry <= (new Date().getTime())) {
			this.deleteToken(token);
			throw "Token Expired";
		}

		return t;
	}

	async deleteToken (token) {
		///console.log(await this.tns.all("SELECT * FROM Tokens"));
		let sql = "DELETE FROM Tokens WHERE token = ?"
		this.tns.run(sql, [token]);

		//console.log(await this.tns.all("SELECT * FROM Tokens"));
	}
}

module.exports = TokenTable;