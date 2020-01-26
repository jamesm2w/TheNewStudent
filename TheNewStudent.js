const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");

const TableTokens = require("./tables/TableTokens.js");
const TableUsers = require("./tables/TableUsers.js");
const TableProfiles = require("./tables/TableProfiles.js");
const TableUserLevel = require("./tables/TableUserLevel.js");
const TableFriendships = require("./tables/TableFriendships.js");

class TheNewStudent {
	
	constructor (dbFilePath) {

		this.TokensTable = new TableTokens(this);
		this.UsersTable = new TableUsers(this);
		this.ProfilesTable = new TableProfiles(this);
		this.UserLevelTable = new TableUserLevel(this);
		this.FriendshipsTable = new TableFriendships(this);

		this.db = new sqlite3.Database(dbFilePath, async err => {
			if (err) {
				console.log("Couldn't connect to the db", err);
			} else {
				
				console.log("Connected to Database");

				this.TokensTable.createTable();
				this.UsersTable.createTable();
				this.ProfilesTable.createTable();
				this.UserLevelTable.createTable();
				this.FriendshipsTable.createTable();

				await this.run(`CREATE VIEW IF NOT EXISTS UsersPublic AS
				 SELECT id, username, ref, 
				 Profiles.picture AS picture,
				 Profiles.description AS description, 
				 Profiles.points AS points,
				 UserLevels.chatLevel AS chatLevel,
				 UserLevels.classLevel AS classLevel,
				 UserLevels.adminLevel AS adminLevel FROM Users
				 INNER JOIN Profiles ON Users.id = Profiles.userId
				 INNER JOIN UserLevels ON Users.id = UserLevels.userId;`);

				await this.run(`CREATE VIEW IF NOT EXISTS UsersPrivate AS 
					SELECT * FROM Users
					INNER JOIN Profiles ON Users.id = Profiles.userId
					INNER JOIN UserLevels ON Users.id = UserLevels.userId;`)

				console.log(await this.all(`SELECT * FROM UsersPrivate`));
				console.log(await this.all(`SELECT * FROM Friendships`));
			}
		});

		this.transporter = nodemailer.createTransport({
		    host: "smtp.ethereal.email",
		    port: 587,
		    auth: {
		        user: "harry4@ethereal.email",
		        pass: "aqT1Q5xAkq6eg2GhG3"
		    }
		    /*host: "smtp-pulse.com",
		    port: 2525,
		    auth: {
		    	user: "jamesmacerwright@gmail.com",
		    	pass: "X5g8j7jk9r"
		    }*/
		});
	}

	sendMail (data) {

		return new Promise((resolve, reject) => {

			this.transporter.sendMail(data).then(info => {

				console.log(nodemailer.getTestMessageUrl(info));
				resolve(info);

			}).catch(e => {
				console.log("Error sending " + JSON.stringify(data));
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