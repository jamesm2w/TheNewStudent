class FriendshipRelationships {
	
	constructor (tns) {
		this.tns = tns;
	}

	createTable () {
		this.tns.run(`
			CREATE TABLE IF NOT EXISTS Friendships (
				friendA INT NOT NULL REFERENCES Users (id) ON UPDATE CASCADE ON DELETE CASCADE,
				friendB INT NOT NULL REFERENCES Users (id) ON UPDATE CASCADE ON DELETE CASCADE,
				verified INT NOT NULL DEFAULT 0,
				PRIMARY KEY (friendA, friendB) ON CONFLICT ABORT
			);`);
	}

	getUserFriends (id) {
		let sql = `SELECT * FROM Friendships
		WHERE friendA = ? OR friendB = ?`;
		return this.tns.all(sql, [id, id]);
	}

	async getFriendArray (id) {
		let returnData = [];
		try {
			let data = await this.getUserFriends(id);

			for (let friend of data) {

				if (id == friend.friendA) {	
					let obj = await this.tns.get("SELECT * FROM UsersPublic WHERE id = ?", [friend.friendB]);

					returnData.push({"user": obj, "verified": friend.verified, "request": false});

				} else if (id == friend.friendB) {
					let obj = await this.tns.get("SELECT * FROM UsersPublic WHERE id = ?", [friend.friendA]);

					returnData.push({"user": obj, "verified": friend.verified, "request": (true && friend.verified == 0)});

				} else {
					// What is the data doing here?
					console.log(friend);
				}
			}
		} catch (err) {
			console.log(err);
		}
		return returnData;
	}

	newFriendship (userA, userB) {
		this.tns.run(`INSERT INTO Friendships (friendA, friendB) VALUES (?, ?)`, [userA, userB]);
	}

	verifyFriendship (userA, userB) {
		this.tns.run(`UPDATE Friendships SET verified = 1 WHERE (friendA = ? AND friendB = ?) OR (friendA = ? AND friendB = ?);`,
			[userA, userB, userB, userA]);
	}

	deleteFriendship (userA, userB) {
		this.tns.run("DELETE FROM Friendships WHERE (friendA = ? AND friendB = ?) OR (friendA = ? AND friendB = ?)",
			[userA, userB, userB, userA]);
	}

}

module.exports = FriendshipRelationships;