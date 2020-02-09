class ClassTable {

	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS Classes (
			id INT PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL DEFAULT "New Class",
			picture TEXT,
			owner INT REFERENCES Users(id) ON UPDATE CASCADE ON DELETE SET NULL,
			created TEXT,
			description TEXT NOT NULL DEFAULT "An amazing group learning new things",
			reference TEXT
			);`);
	}

	createClass (name, owner, ref) {
		return this.tns.run("INSERT INTO Classes (name, owner, created, ref) VALUES (?, ?, ?, ?)",
		 [name, owner, (new Date()).getTime(), ref]);
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
		return this.tns.run("DELETE FROM Classes WHERE id = ?", [id]);
	}

	getClass (id) {
		return this.tns.get("SELECT * FROM Classes WHERE id = ?", [id]);
	}
}

module.exports = ClassTable;