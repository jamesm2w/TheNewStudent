const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");

const TableTokens = require("./tables/TableTokens.js");
const TableUsers = require("./tables/TableUsers.js");
const TableProfiles = require("./tables/TableProfiles.js");
const TableUserLevel = require("./tables/TableUserLevel.js");
const TableFriendships = require("./tables/TableFriendships.js");
const TableClasses = require("./tables/TableClasses.js");
const TableClassMembership = require("./tables/TableClassMembership.js");

const ChatModule = require("./Chat.js");

class TheNewStudent {
	
	constructor (dbFilePath, io) {

		this.TokensTable = new TableTokens(this);
		this.UsersTable = new TableUsers(this);
		this.ProfilesTable = new TableProfiles(this);
		this.UserLevelTable = new TableUserLevel(this);
		this.FriendshipsTable = new TableFriendships(this);
		this.ClassesTable = new TableClasses(this);
		this.ClassMembershipTable = new TableClassMembership(this);

		this.Chat = new ChatModule(this);
		
		io.of("/chat").on("connection", user => {
			this.Chat.connection(user);
		});

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
				this.ClassesTable.createTable();
				this.ClassMembershipTable.createTable();

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

				console.log(await this.all(`SELECT * FROM UsersPublic;`));
				//console.log(await this.all(`SELECT * FROM Friendships`));
				console.log(await this.all(`SELECT * FROM Classes;`));
				console.log(await this.all(`SELECT * FROM ClassMembership;`));
				console.log("User '1' classes:")
				console.log(await this.ClassMembershipTable.getUserClasses("1"));
			}
		});

		this.transporter = nodemailer.createTransport({
		    /*host: "smtp.ethereal.email",
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
			this.db.run(sql, params, function (err) {
				if (err) {
					console.log("Err running " + sql);
					console.log(err);

					reject(err);
				} else {
					resolve(this);
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