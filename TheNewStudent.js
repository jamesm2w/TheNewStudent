const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");

const TableTokens = require("./tables/TableTokens.js");
const TableUsers = require("./tables/TableUsers.js");
const TableProfiles = require("./tables/TableProfiles.js");
const TableUserLevel = require("./tables/TableUserLevel.js");

class TheNewStudent {
	
	constructor (dbFilePath) {

		this.TokensTable = new TableTokens(this);
		this.UsersTable = new TableUsers(this);
		this.ProfilesTable = new TableProfiles(this);
		this.UserLevelTable = new TableUserLevel(this);

		this.db = new sqlite3.Database(dbFilePath, async err => {
			if (err) {
				console.log("Couldn't connect to the db", err);
			} else {
				
				console.log("Connected to Database");

				this.TokensTable.createTable();
				this.UsersTable.createTable();
				this.ProfilesTable.createTable();
				this.UserLevelTable.createTable();

				console.log(await this.all(`SELECT * FROM Tokens
		INNER JOIN Users ON Tokens.userId = Users.id 
		INNER JOIN Profiles ON Tokens.userId = Profiles.userId
		INNER JOIN UserLevels ON Tokens.userId = UserLevels.userId`));

			}
		});

		this.transporter = nodemailer.createTransport({
		    host: "smtp.ethereal.email",
		    port: 587,
		    auth: {
		        user: "harry4@ethereal.email",
		        pass: "aqT1Q5xAkq6eg2GhG3"
		    }
		});
	}

	sendMail (data) {

		return new Promise((resolve, reject) => {

			this.transporter.sendMail(data).then(info => {

				console.log(nodemailer.getTestMessageUrl(info));
				resolve(info);

			}).catch(e => {
				console.log("Error sendind " + JSON.stringify(data));
				console.log(e);

				reject(e);
			});

		});

	}

	run (sql, params = []) {
		return new Promise((resolve, reject) => {
			this.db.run(sql, params, err => {
				if (err) {
					console.log("Err running " + sql);
					console.log(err);

					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	get (sql, params = []) {
		return new Promise((resolve, reject) => {

			this.db.get(sql, params, (err, data) => {
				if (err) {
					console.log("Err running " + sql);
					console.log(err);

					reject(err);
				} else {
					resolve(data);
				}
			});

		});
	}

	all (sql, params = []) {
		return new Promise((resolve, reject) => {
			this.db.all(sql, params, (err, rows) => {
				if (err) {
					console.log("Error running " + sql);
					console.log(err);
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

}

module.exports = TheNewStudent;