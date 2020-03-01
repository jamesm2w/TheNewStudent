class HomeworkTable {

	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		return this.tns.run(`CREATE TABLE IF NOT EXISTS Homework (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			classId INT REFERENCES Classes(id) ON UPDATE CASCADE ON DELETE CASCADE,
			setId INT REFERENCES QuestionSets(id) ON UPDATE CASCADE ON DELETE CASCADE,
			dueDate TEXT,
			UNIQUE (classId) ON CONFLICT ABORT
			)`);
	}

	async createNewHomework (classId, userId, due, difficulty, subject, number = 1, questions = []) {
		let set = await this.tns.QuestionSetTable.createQuestionSet(userId, difficulty, subject, number);

		if (questions == []) {
			await this.tns.QuestionSetTable.randomFillSet(set.lastID);
		} else {
			for (let question of questions) {
				await this.tns.QuestionListTable.addQuestionToSet(set.lastID, question);
			}
		}

		return await this.tns.run("INSERT INTO Homework (classId, setId, dueDate) VALUES (?,?,?)", [classId, set.lastID, due]);
	}

	deleteHomeworkWithClass (classId) {
		return this.tns.run("DELETE FROM Homework WHERE classId = ?", [classId]);
	}

	getHomeworkFromId (id) {
		return this.tns.get("SELECT * FROM Homework INNER JOIN QuestionSets ON QuestionSets.id = setId WHERE Homework.id = ?", [id]);
	}

	getHomeworkFromClass (classId) {
		return this.tns.all(`SELECT * FROM Homework 
			INNER JOIN QuestionSets ON QuestionSets.id = setId 
			
			WHERE classId = ?`, 
			[classId]);
	} //LEFT JOIN QuestionList ON QuestionList.qSetId = QuestionSets.id
}

module.exports = HomeworkTable;