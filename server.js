const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const uuidv1 = require('uuid/v1')
const app = express();
const fs = require("fs");

const TheNewStudent = require("TheNewStudent.js");
const UserProfileTable = require("UserProfile.js");
const TokenTable = require("Tokens.js");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static("node_modules/materialize-css/dist"));

const dbFile = __dirname + "/database.db";
const sqlite3 = require("sqlite3").verbose();

const UsersTable = new UserProfileTable(tns);
const TokensTable = new TokenTable(tns);

var tns = new TheNewStudent(dbFile, () => {
	UsersTable.createTable();
	TokensTable.createTable();
});


app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/register", (req, res) => {
	console.log(req.body);

	req.body.password = crypto.createHash('md5').update(req.body.password).digest('hex');
	db.run(`INSERT INTO Users (username, password, email, dob, regtoken) VALUES (?,?,?,?,?)`,
		[req.body.username, req.body.password, req.body.email, req.body.dob, req.body.regToken],
		err => {
			if (err) {
				console.log(err);
				res.send(JSON.stringify({"success": false, "reason": err}));
			} else {
				res.send(JSON.stringify({"success": true}));
			}
		});
});

app.get("/username", (req, res) => {
	db.get("SELECT * FROM Users WHERE username = ?", req.query.username, (err, data) => {
		if (err) {
			res.send(JSON.stringify({"success": false, "reason": err}));
		} else {
			res.send(JSON.stringify({"success": true, "taken": (typeof data != "undefined")}));
		}
	});
});

app.post("/authenticate", (req, res) => {
	console.log(req.body);

	req.body.password = crypto.createHash('md5').update(req.body.password).digest('hex');

	db.get("SELECT * FROM Users WHERE username = ? AND password = ?", [req.body.username, req.body.password], (err, data) => {
		if (err) {
			res.send(JSON.stringify({"success": false, "reason": err}));
		} else {

			if (typeof data != "undefined") {

				let token = uuidv1();

				db.run("UPDATE Users SET id = ? WHERE iid = ?", [token, data.iid],
					err => {
						if (err) console.log(err);
					})

				res.send(JSON.stringify({"success": true, "token": token}));
			} else {
				res.send(JSON.stringify({"success": false, "reason": "Incorrect Login"}));
			}

		}
	});
	
});

app.get("/authenticate", (req, res) => {
	console.log(req.query);

	db.get("SELECT * FROM Users WHERE id = ?", req.query.token, (err, data) => {
		if (err) {
			res.send(JSON.stringify({"success": false, "reason": err}));
		} else {
			console.log(data);
			if (typeof data != "undefined") {
				res.send(JSON.stringify({"success": true, "token": data.id}));
			} else {
				res.send(JSON.stringify({"success": false, "reason": "Unknown Token"}));
			}

		}
	});
});

var listener = app.listen(2020, () => {
  console.log(`App is listening on port ${listener.address().port}`);
});