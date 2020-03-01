const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");

const TableTokens = require("./tables/TableTokens.js");
const TableUsers = require("./tables/TableUsers.js");
const TableProfiles = require("./tables/TableProfiles.js");
const TableUserLevel = require("./tables/TableUserLevel.js");
const TableFriendships = require("./tables/TableFriendships.js");
const TableClasses = require("./tables/TableClasses.js");
const TableClassMembership = require("./tables/TableClassMembership.js");

const TableHomework = require("./tables/TableHomework.js");
const TableQuestionSet = require("./tables/TableQuestionSet.js");
const TableQuestionList = require("./tables/TableQuestionList.js");
const TableQuestion = require("./tables/TableQuestion.js");
const TableProgress = require("./tables/TableProgress.js");

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

		this.HomeworkTable = new TableHomework(this);
		this.QuestionSetTable = new TableQuestionSet(this);
		this.QuestionListTable = new TableQuestionList(this);
		this.QuestionTable = new TableQuestion(this);
		this.ProgressTable = new TableProgress(this);

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

				this.HomeworkTable.createTable();
				this.QuestionSetTable.createTable();
				this.QuestionListTable.createTable();
				this.QuestionTable.createTable();
				this.ProgressTable.createTable();

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

				console.log("UsersPublic:")
				console.log(await this.all(`SELECT * FROM UsersPublic;`));
				//console.log(await this.all(`SELECT * FROM Friendships`));
				console.log("Questions:")
				console.log(await this.all(`SELECT * FROM Questions;`));
				console.log("QuestionList:")
				console.log(await this.all(`SELECT * FROM QuestionList;`));
				console.log("QuestionSets:")
				console.log(await this.all(`SELECT * FROM QuestionSets;`));
				console.log("Homework:")
				console.log(await this.all(`SELECT * FROM Homework;`));
				console.log("Progress:")
				console.log(await this.all(`SELECT * FROM Progress;`));
			}
		});

		this.transporter = nodemailer.createTransport({
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
