class TableClassMemberships {

	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS ClassMembership (
			classId INT REFERENCES Classes(id) ON UPDATE CASCADE ON DELETE CASCADE,
			userId INT REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
			level INT NOT NULL DEFAULT 0,
			progress INT REFERENCES Progress(id) ON UPDATE CASCADE ON DELETE CASCADE,
			PRIMARY KEY (classId, userId)	
		);`);
	}

	async createMembership (classId, userId, level = 0) {
		try {
			let classes = await this.getUserClasses(userId);
			if (!classes.map(x => x.classId).includes(classId)) {
				return await this.tns.run("INSERT INTO ClassMembership (classId, userId, level) VALUES (?, ?, ?)", 
					[classId, userId, level]);
			} else {
				console.log("User-Class Membership already exists: C" + classId + ", U" + userId);
			}
		} catch (err) {
			throw err;
		}
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

	getUserClassRelationship (classId, userId) {
		return this.tns.get("SELECT * FROM ClassMembership WHERE classId = ? AND userId = ?", [classId, userId]);
	}

	removeUserMembership (classId, userId) {
		this.tns.run("DELETE FROM ClassMembership WHERE classId = ? AND userId = ?", [classId, userId]);
	}

	getUserClasses (userId) {
		return this.tns.all(`SELECT 
			UsersPublic.id, UsersPublic.username, ClassMembership.classId, 
			Classes.name, Classes.picture, Classes.description, Classes.reference, Classes.owner, Classes.created
			FROM UsersPublic 
			LEFT JOIN ClassMembership ON ClassMembership.userId = UsersPublic.id
			INNER JOIN Classes ON Classes.id = ClassMembership.classId
			WHERE UsersPublic.id = ?`, [userId]);
	}

	getClassMembers (classId) {
		return this.tns.all(`SELECT Classes.id AS classId, 
			ClassMembership.userId, 
			UsersPublic.username, UsersPublic.ref, UsersPublic.picture,
			UsersPublic.description, UsersPublic.points, UsersPublic.chatLevel,
			UsersPublic.classLevel, UsersPublic.adminLevel,
			ClassMembership.progress AS classProgress, ClassMembership.level AS localClassLevel
			FROM Classes 
			LEFT JOIN ClassMembership ON ClassMembership.classId = Classes.id 
			INNER JOIN UsersPublic ON UsersPublic.id = ClassMembership.userId
			WHERE Classes.id = ?`, [classId]);
	}
}

module.exports = TableClassMemberships;