class UserProfile {

	constructor (tns) {
		this.tns = tns
	}

	createTable () {
		let sql = `
		CREATE TABLE IF NOT EXISTS Profiles (
			userId INT REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
			picture TEXT NOT NULL DEFAULT "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
			description VARCHAR(240) NOT NULL ON CONFLICT FAIL DEFAULT "Hey there I am on TheNewStudent",
			points INT NOT NULL DEFAULT 0
		)`;
		this.tns.run(sql);
	}

	createProfile (id) {
		return this.tns.run(`INSERT INTO Profiles (userId) VALUES (?)`, [id]);
	}

	setPicture (id, url) {
		return this.tns.run("UPDATE Profiles SET picture = ? WHERE userId = ?", [url, id]);
	}

	setDescription (id, text) {
		return this.tns.run("UPDATE Profiles SET description = ? WHERE userId = ?", [text, id]);
	}

	setPoints (id, pts) {
		return this.tns.run("UPDATE Profiles SET points = ? WHERE userId = ?", [pts, id]);
	}

	incrementPoints (id, amount = 1) {
		return this.tns.run("UPDATE Profiles SET points = points + ? WHERE userId = ?", [amount, id]);
	}
}

module.exports = UserProfile;