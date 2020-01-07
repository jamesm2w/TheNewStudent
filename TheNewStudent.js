const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");

class TheNewStudent {
	
	constructor (dbFilePath, cb) {
		this.db = new sqlite3.Database(dbFilePath, err => {
			if (err) {
				console.log("Couldn't connect to the db", err);
			} else {
				console.log("Connected to Database");
				cb();
			}
		});

		this.mailTransport = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 587,
			secure: false,
			auth: {
				user: "",
				pass: ""
			}
		})
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