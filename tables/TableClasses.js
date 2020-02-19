class ClassTable {

	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS Classes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL DEFAULT "New Class",
			picture TEXT,
			owner INT REFERENCES Users(id) ON UPDATE CASCADE ON DELETE SET NULL,
			created TEXT,
			description TEXT NOT NULL DEFAULT "An amazing group learning new things",
			reference TEXT
			);`);
	}

	createClass (name, owner, ref) {
		return this.tns.run("INSERT INTO Classes (name, owner, created, reference) VALUES (?, ?, ?, ?)",
		 [name, owner, (new Date()).getTime().toString(), ref]);
	}

	setPicture (id, pic) {
		return this.tns.run("UPDATE Classes SET picture = ? WHERE id = ?", [pic, id]);
	}

	setDescription (id, desc) {
		return this.tns.run("UPDATE Classes SET description = ? WHERE id = ?", [desc, id]);
	}

	setReference (id, ref) {
		return this.tns.run("UPDATE Classes SET reference = ? WHERE id = ?", [ref, id]);
	}

	changeOwner (id, newOwner) {
		return this.tns.run("UPDATE Classes SET owner = ? WHERE id = ?", [newOwner, id]);
	}

	deleteClass (id) {
		this.tns.run("DELETE FROM ClassMembership WHERE classId = ?", [id]);
		return this.tns.run("DELETE FROM Classes WHERE id = ?", [id]);
	}

	getClass (id) {
		return this.tns.get(`SELECT 
		Classes.id, name, Classes.description, Classes.picture, created, 
		reference, UsersPublic.username AS ownerUsername, 
		UsersPublic.picture AS ownerPicture FROM Classes 
		INNER JOIN UsersPublic ON UsersPublic.id = Classes.owner WHERE Classes.id = ?`, [id]);
	}

	getClassFromToken (ref) {
		return this.tns.all("SELECT * FROM Classes WHERE reference = ?", [ref]);
	}
}

module.exports = ClassTable;