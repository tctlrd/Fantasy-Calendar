function update_date(new_date){
	if(dynamic_data.year != new_date.year){
		dynamic_data.day = new_date.day;
		dynamic_data.timespan = new_date.timespan;
		dynamic_data.year = new_date.year;
		rebuild_calendar('calendar', dynamic_data);
		update_current_day(true);
	}else if(dynamic_data.timespan != new_date.timespan){
		if(static_data.settings.show_current_month){
			rebuild_calendar('calendar', dynamic_data);
			update_current_day(true);
		}else{
			dynamic_data.day = new_date.day;
			dynamic_data.timespan = new_date.timespan;
			update_current_day(true);
		}
	}else if(dynamic_data.day != new_date.day){
		dynamic_data.epoch += (new_date.day-dynamic_data.day);
		dynamic_data.day = new_date.day;
		update_current_day(false);
	}else{
		dynamic_data.day = new_date.day;
		dynamic_data.timespan = new_date.timespan;
		dynamic_data.year = new_date.year;
	}
}



function getUrlParameter(sParam) {
	var sPageURL = decodeURIComponent(window.location.search.substring(1)),
		sURLVariables = sPageURL.split('&'),
		sParameterName,
		i;

	for (var i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');

		if (sParameterName[0] === sParam) {
			return sParameterName[1] === undefined ? true : sParameterName[1];
		}
	}
};

function update_name(){
	$.ajax({
		url:window.baseurl+"calendars/"+hash,
		type: "post",
		dataType: 'json',
		data: {_method: 'PATCH', name: calendar_name, hash: hash},
		success: function( result ){
			prev_calendar_name = calendar_name;
			document.title = calendar_name + " - Fantasy Calendar";
			calendar_saved();
		},
		error: function ( log )
		{
			console.log(log);
			calendar_save_failed();
		}
	});
}

function update_view_dynamic(calendar_hash){

	$.ajax({
		url:window.baseurl+"calendars/"+calendar_hash,
		type: "post",
		dataType: 'json',
		data: {_method: 'PATCH', dynamic_data: JSON.stringify(dynamic_data)},
		success: function ( result ){
			update_children_dynamic_data();
		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}


function update_dynamic(calendar_hash){

	$.ajax({
		url:window.baseurl+"calendars/"+calendar_hash,
		type: "post",
		dataType: 'json',
		data: {_method: 'PATCH', dynamic_data: JSON.stringify(dynamic_data)},
		success: function ( result ){

			if(!dynamic_same){
				prev_dynamic_data = clone(dynamic_data);
			}

			calendar_saved();

			update_children_dynamic_data();

		},
		error: function ( log )
		{
			console.log(log);
			calendar_save_failed();
		}
	});

}

function update_all(){

	check_last_change(hash, function(output){

		var new_static_change = new Date(output.last_static_change)

		if(last_static_change > new_static_change){

			if(!confirm('The calendar was updated before you saved. Do you want to override your last changes?')){
				return;
			}

			last_static_change = new_static_change;

		}

		do_update_all(hash);

	});
}

function do_update_all(calendar_hash, output){

	$.ajax({
		url:window.baseurl+"calendars/"+calendar_hash,
		type: "post",
		dataType: 'json',
		data: {
		    _method: 'PATCH',
            dynamic_data: JSON.stringify(dynamic_data),
            static_data: JSON.stringify(static_data),
            events: JSON.stringify(events),
            event_categories: JSON.stringify(event_categories),
        },
		success: function(result){

			if(!calendar_name_same){
				prev_calendar_name = clone(calendar_name);
				document.title = calendar_name + " - Fantasy Calendar";
			}

			if(!static_same){
				prev_static_data = clone(static_data);
			}

			if(!dynamic_same){
				prev_dynamic_data = clone(dynamic_data);
			}

			if(!events_same){
				prev_events = clone(events);
			}

			if(!event_categories_same){
				prev_event_categories = clone(event_categories);
			}

			calendar_saved();

			update_children_dynamic_data(function(){
				if(output !== undefined){
					output();
				}
			});

		},
		error: function ( log )
		{
			calendar_save_failed();
			if(log.responseJSON.error){
				$.notify(log.responseJSON.error, "error");
			}
		}
	});
}

function get_all_data(calendar_hash, output){

	$.ajax({
		url:window.apiurl+"/calendar/"+calendar_hash,
		type: "get",
		dataType: 'json',
		data: {},
		success: function(result){

			output(result);

		},
		error: function ( log )
		{
			console.log(log);
		}
	});
}

function get_dynamic_data(calendar_hash, output){

	$.ajax({
		url:window.apiurl+"/calendar/"+calendar_hash+"/dynamic_data",
		type: "get",
		dataType: 'json',
		data: {},
		success: function(result){

			output(result);

		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}

function link_child_calendar(child_hash, parent_link_date, parent_offset, ){

	show_loading_screen();

	do_update_all(hash, function(){

		get_all_data(child_hash, function(result){

			var child_static_data = result.static_data;
			var child_dynamic_data = result.dynamic_data;
			var converted_date = date_converter.get_date(
				static_data,
				child_static_data,
				dynamic_data,
				child_dynamic_data,
				parent_offset
			);

			child_dynamic_data.year = converted_date.year;
			child_dynamic_data.timespan = converted_date.timespan;
			child_dynamic_data.day = converted_date.day;
			child_dynamic_data.epoch = converted_date.epoch;
			child_dynamic_data.hour = converted_date.hour;
			child_dynamic_data.minute = converted_date.minute;

			$.ajax({
				url:window.baseurl+"calendars/"+child_hash,
				type: "post",
				dataType: 'json',
				data: {
					_method: "PATCH",
					parent_hash: hash,
					parent_link_date: parent_link_date,
					parent_offset: parent_offset,
					dynamic_data: JSON.stringify(child_dynamic_data),
				},
				success: function(result){
					window.location.reload();
				},
				error: function ( log )
				{
					console.log(log);
				}
			});
		});

	});
}

function unlink_child_calendar(output, child_hash){

	show_loading_screen();

	do_update_all(hash, function(){
		$.ajax({
			url:window.baseurl+"calendars/"+child_hash,
			type: "post",
			dataType: 'json',
			data: {
				_method: "PATCH",
				parent_hash: null,
				parent_link_date: null,
				parent_offset: null,
			},
			success: function(result){
				window.location.reload();
			},
			error: function ( log )
			{
				console.log(log);
			}
		});
	});
}

function submit_new_event(event_id){

	var event = clone(events[event_id]);
	event._method = "POST";
	event.calendar_id = calendar_id;

	$.ajax({
		url:window.apiurl+"/event",
		type: "post",
		dataType: 'json',
		data: event,
		success: function( result ){
			console.log(result)
			events[event_id].id = result.id;
		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}

function submit_hide_show_event(event_id){

	events[event_id].settings.hide = !events[event_id].settings.hide;

	var event = clone(events[event_id]);
	event._method = "PATCH";
	event.calendar_id = calendar_id;

	$.ajax({
		url:window.apiurl+"/event/"+event.id,
		type: "post",
		dataType: 'json',
		data: event,
		success: function( result ){
			rebuild_events();
			evaluate_save_button();
		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}

function submit_edit_event(event_id){

	var event = clone(events[event_id]);
	event._method = "PATCH";
	event.calendar_id = calendar_id;

	$.ajax({
		url:window.apiurl+"/event/"+event.id,
		type: "post",
		dataType: 'json',
		data: event,
		success: function( result ){
			console.log(result)
		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}

function submit_delete_event(event_id){

	$.ajax({
		url:window.apiurl+"/event/"+event_id,
		type: "post",
		dataType: 'json',
		data: {_method: 'DELETE'},
		success: function( result ){
			console.log(result)
		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}


function get_owned_calendars(output){
	$.ajax({
		url:window.apiurl+"/calendar/"+hash+"/owned",
		type: "get",
		dataType: 'json',
		data: {},
		success: function(result){
			output(result);
		},
		error: function ( log )
		{
			console.log(log);
		}
	});
}


function update_children_dynamic_data(output){

	$.ajax({
		url:window.apiurl+"/calendar/"+hash+"/children",
		type: "get",
		dataType: 'json',
		data: {hash: hash},
		success: function(result){

			var new_dynamic_data = {};

			for(var i in result){

				var child_hash = result[i].hash;

				var child_static_data = result[i].static_data;
				var parent_offset = result[i].parent_offset;
				var child_dynamic_data = result[i].dynamic_data;
				var converted_date = date_converter.get_date(
					static_data,
					child_static_data,
					dynamic_data,
					child_dynamic_data,
					parent_offset
				);

				child_dynamic_data.year = converted_date.year;
				child_dynamic_data.timespan = converted_date.timespan;
				child_dynamic_data.day = converted_date.day;
				child_dynamic_data.epoch = converted_date.epoch;
				child_dynamic_data.hour = converted_date.hour;
				child_dynamic_data.minute = converted_date.minute;

				new_dynamic_data[child_hash] = child_dynamic_data;

			}

			$.ajax({
				url:window.apiurl+"/calendar/"+hash+"/updatechildren",
				type: "post",
				dataType: 'json',
				data: {_method: 'PATCH', data: JSON.stringify(new_dynamic_data)},
				success: function ( result )
				{
					if(output !== undefined){
						output();
					}
				},
				error: function ( log )
				{
					console.log(log);
				}
			});

		},
		error: function ( log )
		{
			console.log(log);
		}
	});
}

function check_last_change(calendar_hash, output){
	$.ajax({
		url:window.apiurl+"/calendar/"+calendar_hash+"/last_changed",
		type: "post",
		dataType: 'json',
		data: {},
		success: function(result){
			output(result);
		},
		error: function ( log )
		{
			console.log(log);
		}
	});
}

function delete_calendar(calendar_hash, calendar_name, callback){

    swal.fire({
        text: "If you're sure about deleting this calendar, please type '" + calendar_name + "' below:",
        input: "text",
        icon: "warning",
		showCancelButton: true,
		confirmButtonColor: '#d33',
		cancelButtonColor: '#3085d6',
		confirmButtonText: 'Delete',
        dangerMode: true
    })
        .then(result => {

        	if(result.dismiss || !result.value) throw null;

            if (result.value !== calendar_name) throw `Sorry! "${result.value}" isn't the same as "${calendar_name}"`;

            return axios.delete('/api/calendar/' + calendar_hash);

        })
        .then(results => {
            if(results.data.error) {
                throw "Error: " + results.data.message;
            }

            swal.fire({
                icon: "success",
                title: "Deleted!",
                text: "The calendar " + calendar_name + " has been deleted.",
                button: true
            })
                .then(success => {
                    callback();
                })
        })
        .catch(err => {
            if(err) {
                console.log(err);
                swal.fire("Oh no!", err, "error");
            } else {
                swal.hideLoading();
                swal.close();
            }
        });

}

function copy_calendar(calendar_hash, calendar_name, callback){

    swal.fire({
        text: "What would you like to call your new copy of '" + calendar_name + "'?",
        input: "text",
		inputPlaceholder: calendar_name + " (clone)",
		showCancelButton: true,
		confirmButtonText: 'Clone',
    })
        .then(result => {

        	if(result.dismiss || result.value === false) throw null;

        	var name = result.value;

            let new_calendar_name = "";

            if (!name) {
                new_calendar_name = calendar_name  + " (clone)";
            } else {
                new_calendar_name = name;
            }

            return axios({
                method: 'post',
                url: '/api/calendar/' + calendar_hash + "/clone",
                data: {
                    new_calendar_name: new_calendar_name
                }
            });
        })
        .then(results => {

            if(results.data.error) {
                throw "Error: " + results.data.message;
            }

            swal.fire({
                icon: "success",
                title: "Copied!",
                text: "The calendar " + calendar_name + " has been cloned.",
                button: true
            })
                .then(success => {
                    callback();
                })
        })
        .catch(err => {
            if(err) {
                console.log(err);
                swal.fire("Oh no!", err, "error");
            } else {
                swal.hideLoading();
                swal.close();
            }
        });

}

function create_calendar(){

	$.ajax({
		url:window.baseurl+"calendars",
		type: "post",
		dataType: 'json',
		data: {
		    name: calendar_name,
            dynamic_data: JSON.stringify(dynamic_data),
            static_data: JSON.stringify(static_data),
            events: JSON.stringify(events),
            event_categories: JSON.stringify(event_categories)
        },
		success: function ( result ){
			localStorage.clear();
			window.location.href = window.baseurl+'calendars/'+result.hash+'/edit';
		},
		error: function ( log )
		{
			console.log(log);
		}
	});

}

function get_event_comments(event_id, callback){

	$.ajax({
		url: window.baseurl+"api/eventcomment/event/"+event_id,
		type: "get",
		dataType: "json",
		success: function ( result ) {
			callback(result['data']);
		},
		error: function ( result ) {
			callback(false);
		}
	});

}

function create_event_comment(content, event_id, callback) {
	$.ajax({
		url: window.baseurl+"api/eventcomment",
		type: 'POST',
		dataType: "json",
		data: {
			calendar_id: calendar_id,
			content: content,
			event_id: event_id
		},
		success: function (result) {
			callback(result['data'].id,result['data']);
		},
		error: function(log) {
			console.log(log)
		}
	});
}
