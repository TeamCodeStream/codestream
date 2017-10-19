'use strict';

var Get_Streams_Test = require('./get_streams_test');

class Get_Channel_Streams_By_Team_Test extends Get_Streams_Test {

	get description () {
		return 'should return the correct streams when requesting channel streams by team ID';
	}

	set_path (callback) {
		let team_id = this.teams[1]._id;
		let team_streams = this.streams_by_team[team_id];
		let user_id = this.current_user._id;
		this.my_streams = team_streams.filter(
			stream => stream.type === 'channel' && stream.member_ids.indexOf(user_id) !== -1
		);
		this.path = '/streams?type=channel&team_id=' + team_id;
		callback();
	}
}

module.exports = Get_Channel_Streams_By_Team_Test;
