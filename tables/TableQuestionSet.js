class QuestionSetTable {
	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		return this.tns.run(`CREATE TABLE IF NOT EXISTS QuestionSets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			author INT REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
			setDifficulty TEXT NOT NULL DEFAULT "easy",
			setSubject TEXT NOT NULL DEFAULT "all",
			number INT NOT NULL DEFAULT 1,
			progress INT REFERENCES Progress(id) ON UPDATE CASCADE ON DELETE CASCADE
		)`);
	}

	createQuestionSet (author, difficulty, subject, number = 1) {
		return this.tns.run("INSERT INTO QuestionSets (author, setDifficulty, setSubject, number) VALUES (?,?,?,?)",
			[author, difficulty, subject, number]);
	}

	deleteQuestionSet (id) {
		this.tns.run("DELETE FROM QuestionList WHERE qSetId = ?", [id])
		return this.tns.run("DELETE FROM QuestionSets WHERE id = ?", [id]);
	}

	getQuestionSet (id) {
		return this.tns.get("SELECT * FROM QuestionSets WHERE id = ?", [id]);
	}

	async isHomework (id) {
		console.log(await this.tns.all("SELECT * FROM Homework WHERE setId = ?", [id]));
		let homework = await this.tns.all("SELECT * FROM Homework WHERE setId = ?", [id]);
		return homework.length != 0;
	}

	async getHomework (id) {
		if (await this.isHomework(id)) {
			return await this.tns.all(`SELECT * FROM Homework 
				INNER JOIN QuestionSets ON QuestionSets.id == setId 
				INNER JOIN UsersPrivate ON UsersPrivate.id == QuestionSets.author WHERE setId = ?`, [id])
		} else {
			return false;
		}
	}

	updateProgress (id, progress) {
		this.tns.run("UPDATE QuestionSets SET progress = ? WHERE id = ?", [progress, id]);
	}

	randomIndexedBiasedLow (list) {
		return Math.floor(list.length * (Math.random() ** 2)) 
	}

	async randomFillSet (id) {
		let qSet = await this.getQuestionSet(id);

		let subject = qSet.setSubject;
		let difficulty = qSet.setDifficulty;
		let number = qSet.number;

		let possibleQuestions = await this.tns.all(`SELECT * FROM Questions 
			WHERE subject LIKE "${subject}%" ORDER BY Questions.difficulty ASC`);

		let selectedQuestions = [];
		console.log("Possible Questions:")
		console.log(possibleQuestions);

		if (possibleQuestions.length == 0) { 
			throw "No matching questions"
			return false;
		};

		while (selectedQuestions.length < number) {
			let relativeDifficulties = possibleQuestions.map(el => [Math.abs(difficulty - el.difficulty), el.id]); 
			//console.log(relativeDifficulties);

			relativeDifficulties = relativeDifficulties.sort((first, second) => {
				return first[0] - second[0];
			});

			//console.log(relativeDifficulties);

			let chosenIndex = this.randomIndexedBiasedLow(relativeDifficulties);
			
			//console.log("Chosen Index: " + chosenIndex);
			
			let chosenQuestion = possibleQuestions.find(el => el.id == relativeDifficulties[chosenIndex][1]);
			
			selectedQuestions.push(chosenQuestion);
			possibleQuestions.splice(possibleQuestions.indexOf(chosenQuestion), 1);
		}
		
		for (let question of selectedQuestions) {
			await this.tns.QuestionListTable.addQuestionToSet(qSet.id, question.id);
		}
		
	}
}

module.exports = QuestionSetTable;