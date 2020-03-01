class QuestionListTable {
	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS QuestionList (
			qSetId INT REFERENCES QuestionsSets(id) ON UPDATE CASCADE ON DELETE CASCADE,
			qId INT REFERENCES Questions(id) ON UPDATE CASCADE ON DELETE CASCADE,
			PRIMARY KEY (qSetId, qId)
		)`);
	}

	addQuestionToSet(setId, qId) {
		this.tns.run("INSERT INTO QuestionList (qSetId, qId) VALUES (?,?)", [setId, qId]);
	}

	removeQuestionFromSet(setId, qId) {
		this.tns.run("DELETE FROM QuestionList WHERE qSetId = ? AND qId = ?", [setId, qId]);
	}

	getQuestionsInSet (setId) {
		return this.tns.all(`SELECT * FROM QuestionSets 
			LEFT JOIN QuestionList ON QuestionList.qSetId = QuestionSets.id 
			INNER JOIN Questions ON Questions.id = QuestionList.qId
			WHERE qSetId = ?`,
		 [setId]);
	}
}

module.exports = QuestionListTable;