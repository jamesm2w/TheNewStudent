class TableProgress {
	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`CREATE TABLE IF NOT EXISTS Progress (
			userId REFERENCES Users(id) ON UPDATE CASCADE ON DELETE CASCADE,
			setId REFERENCES QuestionSets(id) ON UPDATE CASCADE ON DELETE CASCADE,
			pointsGained INT NOT NULL DEFAULT 0,
			questionNum INT NOT NULL DEFAULT 0,
			maxQuestions INT NOT NULL DEFAULT 1,
			correctQuestions INT NOT NULL DEFAULT 0,
			note TEXT,
			PRIMARY KEY (userId, setId) ON CONFLICT ABORT
		)`);
	}

	deleteProgress (userId, setId) {
		this.tns.run(`DELETE FROM Progress WHERE (userId = ? AND setId = ?)`, [userId, setId]);
	}

	createProgress (userId, setId, maxQ) {
		return this.tns.run(`INSERT INTO Progress (userId, setId, maxQuestions) VALUES (?,?,?)`, [userId, setId, maxQ]);
	} 

	async incrementQuestionNum (userId, setId) {
		await this.tns.run(`UPDATE Progress SET questionNum = questionNum + 1 WHERE (userId = ? AND setId = ?)`, 
			[userId, setId]);
		let progress = await this.getProgress(userId, setId);

		return progress.questionNum >= progress.maxQuestions;
	}

	incrementCorrectQuestions (userId, setId) {
		return this.tns.run(`UPDATE Progress
		 SET correctQuestions = correctQuestions + 1 
		 WHERE (userId = ? AND setId = ?)`, 
			[userId, setId]);
	}

	addPoints (userId, setId, points) {
		this.tns.run(`UPDATE Progress SET pointsGained = pointsGained + ? WHERE (userId = ? AND setId = ?)`,
			[points, userId, setId]);
	}

	async getProgress (userId, setId) {
		return await this.tns.get(`SELECT * FROM Progress
		INNER JOIN QuestionSets ON QuestionSets.id = Progress.setId
		WHERE userId = ? AND setId = ?`, [userId, setId]);
	}

	setNote (userId, setId, note) {
		this.tns.run(`UPDATE Progress SET note = ? WHERE (userId = ? AND setId = ?)`,
			[note, userId, setId]);
	}

	getAllUserProgress (userId) {
		return this.tns.all(`SELECT * FROM Progress 
			LEFT JOIN QuestionSets ON Progress.setId = QuestionSets.id
			WHERE Progress.userId = ?`, [userId]);
	}

	addPointsToUser (userId, setId) {
		return this.tns.get(`UPDATE Profiles 
			SET points = points + 
				(SELECT pointsGained FROM Progress WHERE Progress.setId = ? AND Progress.userId = Profiles.userId) 
			WHERE Profiles.userId = ?`, [setId, userId]);
	}
}

module.exports = TableProgress;