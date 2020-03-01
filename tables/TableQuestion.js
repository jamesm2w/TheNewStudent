class QuestionTable {
	constructor (tns) {
		this.tns = tns;
	}

	/* 
	 * type: 0 - short answer; 1 - multiple choice optns; 2 - math answer; 3 - long answer
	 * difficulty: rating out of 10; 0 - 3 EASY; 4 - 7 MEDIUM; 8 - 10 HARD;
	 * correct: 0 - direct match; 1 - option index; 2 - equivalent answer; 3 - mark scheme/guidelines
	 * options: 0 - ; 1 - JSON string of optns; 2 -; 3 -
	 * media: optional image / video link for use in the question

	 * text: question text/prompt
	 * subject: string of which subject this question belongs to
	 */

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS Questions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type INT NOT NULL DEFAULT 0,
			subject TEXT NOT NULL DEFAULT "global",
			difficulty INT NOT NULL DEFAULT 0,
			text TEXT NOT NULL DEFAULT "Question Text Here",
			correct TEXT NOT NULL DEFAULT "Correct Answer",
			options TEXT,
			media TEXT
		)`);
	}

	getQuestion (id) {
		return this.tns.get("SELECT * FROM Questions WHERE id = ?", [id]);
	}

	createQuestion (questionObj) {
		this.tns.run("INSERT INTO Questions (type, subject, difficulty, text, correct, options, media) VALUES (?,?,?,?,?,?,?)",
			[questionObj.type, questionObj.subject, questionObj.difficulty, questionObj.difficulty, questionObj.text,
			questionObj.correct, questionObj.options, questionObj.media]);
	}

	async checkAnswer (id, answer) {
		let question = await this.tns.get("SELECT * FROM Questions WHERE id = ?", [id]);

		if (question.type == 3) {

			return -1;

		} else {
			return answer.toString().toLowerCase() == question.correct.toString().toLowerCase();
		}
	}

	getQuestionsWithSubject (subject) {
		return this.tns.all(`SELECT * FROM Questions WHERE subject LIKE "${subject}%"`);
	}
}

module.exports = QuestionTable;