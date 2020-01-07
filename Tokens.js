const uuidv1 = require("uuidv1");

class TokenTable {
	
	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		let sql = `
			CREATE TABLE IF NOT EXISTS Tokens (
				token TEXT,
				userId INTEGER,
				expiry INTEGER,
				FOREIGN KEY userId REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE 
			)
		`
		this.tns.run(sql);
	}

	createToken (userId) {

		let expiry = new Date(new Date().getTime() + 60 * 60 * 24 * 1000);

		let sql = "INSERT INTO Tokens (token, userId, expiry) VALUES (?, ?, ?)";
		let params = [uuidv1(), userId, expiry.getTime()];

		this.tns.run(sql, params);
	}

	getUser (token) {
		let sql = "SELECT * FROM Tokens WHERE token = ? INNER JOIN Users ON Tokens.userId = Users.id";
		return this.tns.get(sql, [token]);
	}

	deleteToken (token) {
		let sql = "DELETE FROM Tokens WHERE token = ?"
		this.tns.run(sql, [token]);
	}
}

module.exports = TokenTable;