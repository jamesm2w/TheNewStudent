class TableClassMemberships {

	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS ClassMembership (
			classsId INT REFERENCES Classes(id) ON UPDATE CASCADE ON DELETE CASCADE,
			userId INT REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
			level INT NOT NULL DEFAULT 0,
			progress INT NOT NULL DEFAULT 0,
			PRIMARY KEY (classId, userId)	
		);`);
	}

	createMembership (classId, userId) {
		this.tns.run("INSERT INTO ClassMembership (classId, userId) VALUES (?, ?)", [classId, userId]);
	}

	leaveClass (classId, userId) {
		this.tns.run("DELETE FROM ClassMembership WHERE classId = ? AND userId = ?", [classId, userId]);
	}

	setUserLevel (classId, userId, lvl) {
		this.tns.run("UPDATE ClassMembership SET level = ? WHERE classId = ? AND userId = ?", [lvl, classId, userId]);
	}

	setProgress (classId, userId, progress) {
		this.tns.run("UPDATE ClassMembership SET progress = ? WHERE classId = ? AND userId = ?", [progress, classId, userId]);
	}

	getUserClasses (userId) {
		return this.tns.all(`SELECT * FROM UsersPublic 
			LEFT JOIN ClassMembership ON ClassMembership.userId = id 
			WHERE id = ?`, [userId]);
	}

	getClassMembers (classId) {
		return this.tns.all(`SELECT * FROM Classes 
			LEFT JOIN ClassMembership ON ClassMembership.classId = id 
			WHERE id = ?`, [classId]);
	}
}

module.exports = TableClassMemberships;