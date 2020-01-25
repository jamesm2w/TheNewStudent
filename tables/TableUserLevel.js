class UserLevel {

	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`
			CREATE TABLE IF NOT EXISTS UserLevels (
				userId REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
				classLevel INT NOT NULL DEFAULT 0,
				chatLevel INT NOT NULL DEFAULT 0,
				adminLevel INT NOT NULL DEFAULT 0
			)`);
	}

	createUserLevels (id) {
		return this.tns.run(`INSERT INTO UserLevels (userId) VALUES (?)`, [id]);
	}

	setClassLevel (id, lvl) {
		return this.tns.run("UPDATE UserLevels SET classLevel = ? WHERE userId = ?", [id, lvl]);
	}

	setChatLevel (id, lvl) {
		return this.tns.run("UPDATE UserLevels SET chatLevel = ? WHERE userId = ?", [id, lvl]);
	}

	setAdminLevel (id, lvl) {
		return this.tns.run("UPDATE UserLevels SET adminLevel = ? WHERE userId = ?", [id, lvl]);
	}

	getLevels (id) {
		return this.tns.get("SELECT * FROM UserLevels WHERE userId = ?", [id]);
	}

	getAllWithClassLevel (lvl) {
		return this.tns.all("SELECT * FROM UserLevels INNER JOIN Profiles ON UserLevels.userId = Profiles.id WHERE classLevel = ?",
		 [lvl]);
	}

	getAllWithChatLevel (lvl) {
		return this.tns.all("SELECT * FROM UserLevels INNER JOIN Profiles ON UserLevels.userId = Profiles.id WHERE chatLevel = ?",
		 [lvl]);
	}

	getAllWithAdminLevel (lvl) {
		return this.tns.all("SELECT * FROM UserLevels INNER JOIN Profiles ON UserLevels.userId = Profiles.id WHERE adminLevel = ?",
		 [lvl]);
	}

}

module.exports = UserLevel;