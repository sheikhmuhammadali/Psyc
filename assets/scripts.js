$(document).ready(function() {
	//variables
	var accent = "#128C7E"
	var object = {data : []};
	var id = null;
	var isLoggedIn = true;
	var user_id = "user@usermail.com";
	var md = require('markdown-it')();
	var link_clicked = false;
	var mode = "text";

	var storage = require('electron-json-storage');
    remote = require('electron').remote;
	var ipcRenderer = require('electron').ipcRenderer;   

	
	var toggle_menu = true;
	todo_object = {data: []};
	priority_object = {data: []};
	todo_count = 1;
	delete_item_mode = false;
	pin = "";
	protected = false;




    var grid_toggle = false;
    
    var width = remote.getGlobal('dimensions').width;
    var height =  remote.getGlobal('dimensions').height;

	win = remote.getCurrentWindow();

	//loading animation
	setTimeout(function(){
		$("#loading").fadeOut('300');
		setTimeout(function(){
			$("#loading").removeClass('hidden');
		},400);
	},1000);

	//sortable lists
	/* 
	$("ol").sortable();


	var group = $("ol").sortable({
	  group: 'serialization',
	  delay: 500,
	  onDrop: function ($item, container, _super) {
	    var data = group.sortable("serialize").get();

	    var jsonString = JSON.stringify(data, null, ' ');

	    l(jsonString);
	  }
	});
	*/ 


	//hide todo input div at startup, its 'undhidden' later
	$('#todo_input_div').addClass('hidden');

	//hide expanded menu on startup
	$('#expanded_menu').fadeOut(0);

	//hide todo note ui menu on startup
	$('#todo_note').fadeOut(0);

	//handle all links and open them in external browser
	$(document).on('click', 'a[href^="http"]', function(event) {
	    event.preventDefault();
	    link_clicked = true;
	    
	    var remote = require('electron').remote;
		var ipcRenderer = require('electron').ipcRenderer; 
		remote.getGlobal('open_url').url = this.href;

		ipcRenderer.send('open_url');
		ipcRenderer.on('open_url', function(event, arg) {
			if(arg == 1){
				popup("URL opened in your default browser.");
			}	
		});
	});

	//handle clicks on <li> in to-do mode 
	$(document).on('click', '#rendered_note ol li', function(event) {
	    link_clicked = true;
	    if(!~($(this).text().indexOf("Completed")))
	    	$(this).html('<span style="color:red; text-decoration: line-through;"><span style="color: #111">' + $(this).text() + '</span></span> <span style="float: right; opacity: 0.6; color:#aaa">Completed</font></span>');
	    else{
	    	var string = $(this).text().replace('Completed','');
	    	$(this).html('<font style="text-decoration: none;">' + string);
	    }
	});


	//send request for note data from main process
	ipcRenderer.send('main_to_ren_data');

	//process the note data and setup the ui
	ipcRenderer.on('main_to_ren_data', function(event, arg) {
		if(arg == 1){
			//get note object
			object = remote.getGlobal('note_retrieve').note_string;
			//user email
			user_id = remote.getGlobal('login').email;

			l(JSON.stringify(object), "Object recieved at startup");

			setTimeout(function(){
				// get note id
				if(id === null){
					id = remote.getGlobal('note_retrieve').id;

					//get note mode
					mode = remote.getGlobal('note_retrieve').mode;
				}

				//set ui according to mode
				if(mode === 'text'){
					$("#rendered_note").fadeIn(0);
				}
				else if(mode === 'todo'){
					$("#todo_note").fadeIn(0);

					//request focus on todo input
					window.setTimeout(function ()
			    	{
			    		$("#new_li").focus();
			    	},0);
				}

				//check if user is logged in or not
				if(remote.getGlobal('login').eemail === 'skipped') isLoggedIn = false;


				//set up ui and note
				if(id === object.id){
					var heading = object.title;
					protected = object.protected;
					if(protected) pin = object.pin;

					var note = object.note;
					accent = object.accent;
					grid_toggle = object.grid;

					//setup note heading
					if(heading !== 'empty') $('#heading').val(heading);

					//show curtain?
					if(protected){
						$('#curtain').fadeIn(0);
						$('#b_secure').attr("src","img/secured.png");
						setTimeout(function(){
							$('#pin_code').focus();
						},0);
					}
					else {
						$('#curtain').fadeOut(0);
						pin = "";
					}
					
					//mode specefic ui changes
					if(mode === 'text' && note !== 'empty') {
						//set edit note text
						$('#edit_note').val(note);

						//enable template menu
						$("#b_insert").removeClass('hidden');

						//disable todo input div
						$('#todo_input_div').addClass('hidden');

						//disable todo item delete button
						$('#b_todo_delete_item').addClass('hidden');
					}
					else if(mode === 'todo'){

						//disable template menu
						$("#b_insert").addClass('hidden');

						//enable todo input div
						$('#todo_input_div').removeClass('hidden');

						//enable todo item delete button
						$('#b_todo_delete_item').removeClass('hidden');

						todo_object = JSON.parse(note);		//object

						if(todo_object === null) todo_object = {data: []};

						//refresh todo list by resetting it
						$('#ol').html("");
						var todo_array = todo_object.data;

						for(var i = 0; i < todo_array.length; i++){
							//if(current item is not empty or deleted)
							if(todo_array[i] !== '' && todo_array[i].item.trim() !== 'empty' && todo_array[i].item.trim() !== '&deleted'){
								todo_count++;
								var local_important = false;
								if(todo_array[i].item.charAt(0) === '!') local_important = true;

								//if current item is unmarked && not important
								if(!todo_array[i].marked && !local_important)
									$('#ol').append('<li style="border: 1px dashed #BBB;"><span class="un_item_unimportant">' + todo_array[i].item + '</span></li>');
								//if current item is marked && not important
								else if(todo_array[i].marked && !local_important)
									$('#ol').append('<li style="border: 1px solid' + accent +';"><span class="marked_item_unimportant">' + todo_array[i].item + '</span></li>');

								//if current item is unmarked && important
								else if(!todo_array[i].marked && local_important)
									$('#ol').append('<li style="border: 1px dashed #BBB;"><span class="un_item_important"><font style="display: none; opacity:0; font-size:0;">!</font>' + todo_array[i].item.slice(1) + '</span></li>');
								//if current item is marked && important
								else if(todo_array[i].marked && local_important)
									$('#ol').append('<li style="border: 1px solid' + accent +';"><span class="marked_item_important"><font style="display: none; opacity:0; font-size:0;">!</font>' + todo_array[i].item.slice(1) + '</span></li>');

								// construct an object of important items
								if(local_important){
									priority_object.data.push({
										'id' : r(),
										'item' : todo_array[i].item.slice(1),
									});
								}

								//set up view
								if(grid_toggle) goGrid();
								else noGrid();

							}
						}

						//setup ui if todo list is not empty
						if(todo_count > 1){
								$("#empty_ol").addClass('hidden');
								$("#ol").removeClass('hidden');

						}
						//if todo is empty
						else if(todo_count <= 1){
							$("#empty_ol").removeClass('hidden');
							$("#ol").addClass('hidden');
						}
					}


					// set user email in user menu
					if(user_id !== 'empty' || user_id !== 'skipped') $('#user_id').text(user_id);

					// set rendered note in text mode
					if($('#edit_note').val() !== "" && mode === 'text') $('#rendered_note').html(md.render($('#edit_note').val()));

					//general ui setup
					applyCSS();

				}
			}, 0);
		}	
	});


	

	/*
	----------------------	IPC functions ---------------------
	*/

	function sendUpdateIPC(mode){
	 	var remote = require('electron').remote;
		var d = new Date();
    	var n = d.getTime();

    	// construct object
	 	var object = {};

		object.id = id;
		if(mode === 'todo') object.note = JSON.stringify(todo_object);
		if(mode === 'text') object.note = $('edit_note').val();
		object.title = $('#heading').val();
		object.accent = accent;
		object.mode = mode;
		object.timestamp = n;
		object.width = width;
		object.height = height;
		object.protected = protected;
		object.grid = grid_toggle;
		object.pin = pin;

		l(object.note, "IPC: note updated");

		//update global object
		remote.getGlobal('note_update').note_string = object;

		//send IPC
		var ipcRenderer = require('electron').ipcRenderer;   
		ipcRenderer.send('ren_to_main_data');

	}

		function deleteMe(){
	 	var remote = require('electron').remote;
		remote.getGlobal('note_delete').id = id; 

		var ipcRenderer = require('electron').ipcRenderer;   
		ipcRenderer.send('delete_note');
	 
		ipcRenderer.on('delete_note', function(event, arg) {
			if(arg == 1){
				const remote = require('electron').remote;
				var window = remote.getCurrentWindow();

				window.close();
			}	
		});
	}

	function sendSyncIPC(mode){
		var remote = require('electron').remote;

		//initialize object
	 	var object = {};
		
		var d = new Date();
    	var n = d.getTime();

		object.id = id;
		if(mode === 'text') object.note = $('#edit_note').val();
		else if(mode === 'todo') object.note = JSON.stringify(todo_object);
		object.title = $('#heading').val();
		object.accent = accent;
		object.timestamp = n;
		object.width = width;
		object.height = height;
		object.protected = protected;
		object.grid = grid_toggle;
		object.pin = pin;

		remote.getGlobal('sync').note_string = object; 
		remote.getGlobal('sync').id = id; 

		var ipcRenderer = require('electron').ipcRenderer;   
		ipcRenderer.send('sync');
	}



	function createNote(){
		var remote = require('electron').remote;
		var ipcRenderer = require('electron').ipcRenderer;   
		ipcRenderer.send('new_note');
	}




	

	/*
	----------------------	Helper functions ---------------------
	*/


	
	function hideAllModes(){
		$('#rendered_note').fadeOut(80);
		$('#todo_note').fadeOut(80);
	}



	//switch to edit menu helper
	function switchEditMenuHelper(){
		toggle_menu = true;


		$('#edit_menu_div').fadeIn(200);
		$('#color_picker_div').fadeIn(200);

		if(mode === 'text'){
			$('#edit_note').removeClass('hidden'); 
			$('#edit_note').fadeOut(0);
			$('#edit_note').fadeIn(200);

			//disable todo input div
			$('#todo_input_div').addClass('hidden');

			//disable todo delete item button
			$('#b_todo_delete_item').addClass('hidden');


		}
		else if(mode === 'todo') 
			$('#edit_note').addClass('hidden');
	}



	function hideAuxMenus(){
		//if template menu is open, close it.
		if(template_menu_toggle) {
			$('#template_menu').slideUp();
			template_menu_toggle = false;
		}

		//if keyboard menu is open, close it.
		if(keyboard_menu_toggle){
			$('#keyboard_menu').slideUp();
			keyboard_menu_toggle = false;
		}

		//if security menu is open, close it.
		if(security_menu_toggle){
			$('#security_menu').slideUp();
			security_menu_toggle = false;
		}
	}


	//show save animation
	function showSaveAnimation(){
		$('#b_mode_menu_saved').clearQueue();
		$('#b_mode_menu_saved').removeClass('hidden');
		$('#b_mode_menu_saved').fadeIn(100).delay(2000).fadeOut(600);
	}

	//turn off delete item mode in todo mode
	function turnDeleteModeOff(){
		if(mode === 'todo'){
			delete_item_mode = false;
			$('#b_todo_delete_item').attr("src","img/delete_item.png");
		}
	}

	//apply css to note content and other ui
	function applyCSS(){
		$("#accentBar").css("background", accent);
		$("#accentBarMover").css("background", accent);
		$("#heading").css("color", accent);
		$("a").css("color", accent);
		$("h1").css("color", accent);
		$("h2").css("color", accent);
		$("h3").css("color", accent);
		$("h4").css("color", accent);
		$("h5").css("color", accent);
		$("hr").css("border-color", accent);
		$(".note th").css("color", accent);
		$("tr:odd").css("background-color", "rgba(220,220,220, 0.5468)");
		$(".todo_button").css("background", accent);

		$("#pin_code").css("border-color", accent);
		$("#pin_code").css("color", accent);
		$(".curtain button").css("background", accent);
		$(".security_menu button").css("background", accent);
		$(".security_menu button").css("background", accent);


		$(".marked_item").css("border-color", accent);
	}


    function goGrid(){
    	if(mode === 'todo') {
	    	$('.todo_note li').css('display','inline-block');
	    	// $('ol li').css('float','left');
			$('.todo_note li span').css('background-position','center right 26px');
			$('.todo_note li span').css('padding-right','32px');
			grid_toggle = true; 		
		}
    }

    function noGrid(){
    	if(mode === 'todo'){
	    	$('.todo_note li').css('display','block');
	    	// $('ol li').css('float','');
			$('.todo_note li span').css('background-position','center right');
			$('.todo_note li span').css('padding-right','');$('li').addClass('remove-item');
			grid_toggle = false;
		}
    }



	

	/*
	----------------------	Todo: Menu actions ---------------------
	*/


	
	// switch to todo mode
	$('#b_todo_mode').click(function (e) {
		if(mode !== 'todo'){
			popupPersistent("Changing to to-do mode will delete current markdown data.", true, function(result){
			
				if(result){
					hideAllModes();

					//disable template menu
					$("#b_insert").addClass('hidden');
					$("#template_menu").slideUp();
					template_menu_toggle = false;

					//enable todo input div
					$('#todo_input_div').removeClass('hidden');

					//enable todo item delete button
					$('#b_todo_delete_item').removeClass('hidden');

					//switch back to main menu
					setTimeout(function() {	
						$('#edit_menu_div').fadeOut(200);
						$('#expanded_menu').fadeOut(200);
						$('#color_picker_div').fadeOut(200);
						$('#edit_note').fadeOut(200);
					}, 200);
					$('#menu').fadeIn(200);

					//show minion
					$("#empty_ol").removeClass('hidden');
					$("#ol").addClass('hidden');

					//reset todo list
					$('#ol').html("");
					todo_count = 1;

					$('#todo_note').fadeIn(200);

					//change mode
					mode = 'todo';

					//initialize todo object
					todo_object = {data : []};

					todo_object.data.push({
						'id' : r(),
						'item' : 'empty',
						'marked' : false,
					});

					sendUpdateIPC(mode);

					//on note update
					var k = 0;
					ipcRenderer.on('ren_to_main_data', function(event, arg) {
						if(arg==1 && k ==0){
							setTimeout(function(){
								popup("Switched to to-do mode.");
							}, 400);
							k++;
						}	
					});
				}
			});
		}
	});


	// add new list item in todo mode
	$('#add_li').click(function (e) {

		var d = new Date();
    	var n = d.getTime();
    	
		//If current item to be added is not empty
		if($('#new_li').val().trim() !== '') {
			todo_count++;

			//push new entry to todo object
			todo_object.data.push({
				'id' : r(),
				'item' : $('#new_li').val(),
				'marked' : false,
			});

			
			//determine if new entry is important
			var important = false;
			if($('#new_li').val().trim().charAt(0) === '!') important = true;

			//setup ui accordingly
			if(!important) $('#ol').append('<li><span class="un_item_unimportant">' + $('#new_li').val() + '</span></li>');
			else {
				$('#ol').append('<li><span class="un_item_important"><font style="display: none;">!</font>' + $('#new_li').val().slice(1) + '</span></li>');
				
				//push entry to priority list if important
				priority_object.data.push({
					'id' : r(),
					'item' : $('#new_li').val().slice(1),
				});

			}

			//reset todo input
			$('#new_li').val('');

			//hide minion
			$("#empty_ol").addClass('hidden');
			$("#ol").removeClass('hidden');

			//setup view
			if(grid_toggle) goGrid();
			else noGrid();

			mode = 'todo';

			//update note
			sendUpdateIPC(mode);

			//turn off delete item mode
			turnDeleteModeOff();

			//exit edit mode
			exitEditMode();

			//reput focus on todo input
			$("#new_li").focus();
		}
	});


	//when a list item is clicked
	var clicked_once = false;
	var clicked_on = "";
	$(document).on('click', '#ol li', function(event) {

		//if current item should be marked as completed
	    if(!~($(this).text().indexOf("&Completed")) && !(~($(this).html().indexOf("marked_item"))) && !delete_item_mode){

	    	$(this).css('border', '1px solid ' + accent);

	    	var local_important = false;
	    	if($(this).text().charAt(0) === '!') local_important = true;

	    	if(!local_important) $(this).html('<span class="marked_item_unimportant">' + $(this).text() + '<font style="opacity: 0.0; font-size: 0; display: none;">&Completed</font></font></span>');
			else $(this).html('<span class="marked_item_important"><font style="color: #111"><font style="display: none">!</font>' + $(this).text().slice(1) + '</font><font style="display: none; width: 0px; opacity: 0.0; font-size: 0;">&Completed</font></font></span>');

			clicked_once = true;
			clicked_on = $(this).text().replace('&Completed','');

			var todo_array = todo_object.data;

			for(var i = 1; i < todo_array.length; i++){
				if(todo_array[i].item.trim() === $(this).text().replace('&Completed','').trim()){
					todo_array[i].marked = true;
				}
			}

			todo_object.data = todo_array;
		}
		//delete current todo item in delete mode from edit menu
	  	else if(delete_item_mode){
	  		$(this).closest('li').remove();

	    	var todo_array = todo_object.data;
			for(var i = 1; i < todo_array.length; i++){
				if(todo_array[i].item.trim() === $(this).text().replace('&Completed','').trim()){
					todo_array[i].item = '&deleted';
					todo_count--;
				}
			}

	    	//check if list becomes empty, and show minions if it does
	    	if(todo_count == 1){
	    		$("#empty_ol").removeClass('hidden');
				$("#ol").addClass('hidden');

				clicked_once = false;
				$('#b_todo_delete_item').attr("src","img/delete_item.png");
				delete_item_mode = false;

				//switch from edit menu to default menu
				setTimeout(function() {	
					$('#edit_menu_div').fadeOut(200);
					$('#color_picker_div').fadeOut(200);
					$('#edit_note').fadeOut(200);
				}, 200);
				$('#menu').fadeIn(200);
			}
	  	}

	    //item needs to be unmarked
	    else{
	    	var string = $(this).text().replace('&Completed','');

	    	$(this).css('border', '1px dashed ' + '#BBB');

	    	var local_important = false;
	    	if($(this).text().charAt(0) === '!') local_important = true;

	    	if(!local_important) $(this).html('<span class="un_item_unimportant"><font style="text-decoration: none;">' + string + '</span>');
	    	else  $(this).html('<span class="un_item_important"><font style="text-decoration: none; display: none;">!</font>' + string.slice(1) + '</span>');

	    	clicked_once = false;
			clicked_on = "";


			var todo_array = todo_object.data;
			for(var i = 1; i < todo_array.length; i++){
				if(todo_array[i].item.trim() === $(this).text().replace('&Completed','').trim()){
					todo_array[i].marked = false;
				}
			}

			todo_object.data = todo_array;
	    }
		
	    //update note
		sendUpdateIPC(mode);

		//setup view
		if(grid_toggle) goGrid();
		else noGrid();
	});

	//switch to delete item mode
	$('#b_todo_delete_item').click(function (e) {
		delete_item_mode = !delete_item_mode;
		clicked_once = true;
		if(delete_item_mode){ 
			$('#b_todo_delete_item').attr("src","img/delete_item_mode_on.png");
			popup("Click on the items you wish to delete. <br><br>When done, click on the icon again to turn 'Delete mode' off.");
		}
		else {
			clicked_once = false;
			$('#b_todo_delete_item').attr("src","img/delete_item.png");
		}
	});

	// switch to edit mode from menu icon
	$('#b_edit').click(function (e) {
		setTimeout(function() {	
			$('#menu').fadeOut(200);
		}, 200);
		
		switchEditMenuHelper();
	});

	// switch to edit mode from expanded menu icon
	$('#b_edit_expanded_menu').click(function (e) {
		setTimeout(function() {	
			$('#menu').fadeOut(200);
			$('#expanded_menu').fadeOut(200);
		}, 200);
		
		switchEditMenuHelper();

	});

	//hide all menus when todo note body is clicked
	$('#todo_note').click(function(){
		hideAuxMenus();
	});





	

	/*
	----------------------	Text: Menu actions ---------------------
	*/


	//switch to text mode
	$('#b_text_mode').click(function (e) {
		if(mode !== 'text'){
			var proceed = false;
			popupPersistent("Changing to markdown text mode will delete current to-do data.", true, function(result){

				if(result){
					hideAllModes();

					//enable template menu
					$("#b_insert").removeClass('hidden');

					//disable todo input div
					$('#todo_input_div').addClass('hidden');

					//disable todo item delete button
					$('#b_todo_delete_item').addClass('hidden');

					//switch back to main menu
					setTimeout(function() {	
						$('#edit_menu_div').fadeOut(200);
						$('#expanded_menu').fadeOut(200);
						$('#color_picker_div').fadeOut(200);
					}, 200);
					$('#menu').fadeIn(200);

					//show rendered note
					$('#rendered_note').fadeIn(200);

					//set mode
					mode = 'text';

					sendUpdateIPC(mode);
				 
					//on note update
					var k = 0;
					ipcRenderer.on('ren_to_main_data', function(event, arg) {
						if(arg==1 && k == 0){
							setTimeout(function(){
								popup("Switched to markdown text mode.");
							}, 400);
							k++;
						}	
					});
				}
			}); 
			
		}
	});


	//switch to edit mode by clicking on rendered note
	$('#rendered_note').click(function (e) {
		var local_keyboard_menu_toggle = keyboard_menu_toggle;

		setTimeout(function() {	
			if(!link_clicked && !local_keyboard_menu_toggle){	
				setTimeout(function() {	
					$('#menu').fadeOut(200);
					$('#expanded_menu').fadeOut(200);
				}, 200);
				
				switchEditMenuHelper();
			}
		}, 200);

		hideAuxMenus();

		link_clicked = false;
	});


	//hide all menus when edit note body is clicked
	$('#edit_note').click(function(){
		hideAuxMenus();
	});


	//update text note in text mode
	$('#edit_note').bind('input propertychange', function() {
	 	mode = 'text';

	 	sendUpdateIPC(mode);
	 
	 	var k = 0;
		ipcRenderer.on('ren_to_main_data', function(event, arg) {
			if(arg==1 && k++ == 0){
				showSaveAnimation();
			}	
		});
	});

	

	//update title
	$('#heading').bind('input propertychange', function() {
	  	mode = 'text';

	 	sendUpdateIPC(mode);
	 
	 	var k = 0;
		ipcRenderer.on('ren_to_main_data', function(event, arg) {
			if(arg==1 && k++ == 0){
				showSaveAnimation();
			}	
		});
	});


	

	/*
	----------------------	General: Menu actions ---------------------
	*/




	//show expanded menu
	$('#b_more').click(function (e) {
		if(toggle_menu){
			setTimeout(function() {	
				$('#expanded_menu').fadeIn(200);
			}, 200);
			$('#color_picker_div').fadeIn(200);
		}
		else{
			setTimeout(function() {	
				$('#expanded_menu').fadeOut(200);
			}, 200);
			$('#color_picker_div').fadeOut(200);
		}
		toggle_menu = !toggle_menu;
	});

	//hide expanded menu
	$('#b_more_expanded_menu').click(function (e) {
		if(toggle_menu){
			setTimeout(function() {	
				$('#expanded_menu').fadeIn(200);
			}, 200);
			$('#color_picker_div').fadeIn(200);
		}
		else{
			setTimeout(function() {	
				$('#expanded_menu').fadeOut(200);
			}, 200);
			$('#color_picker_div').fadeOut(200);
		}
		toggle_menu = !toggle_menu;

		hideAuxMenus();
	});

	//when save icon in edit menu is clicked
	$('#b_edit_menu_save').click(function (e) {
		setTimeout(function() {	
			$('#edit_menu_div').fadeOut(200);
			$('#color_picker_div').fadeOut(200);
			$('#edit_note').fadeOut(200);
		}, 200);

		//show menu
		$('#menu').fadeIn(200);

		//update rendered note html
		if($('#edit_note').val() !== "") $('#rendered_note').html(md.render($('#edit_note').val()));
		else  $('#rendered_note').html("<font size='2px' color='#AAA'>To edit, you can click here, or use the 'Edit' icon to enter edit mode.</font>");

		//hide all menus
		hideAuxMenus();

		//turn off delete mode in todo mode
		turnDeleteModeOff();
		
		//update appearence
		applyCSS();

	});

	//when save icon in expanded menu is clicked
	$('#b_edit_menu_save_expanded_menu').click(function (e) {
		setTimeout(function() {	
			toggle_menu = true;
			$('#expanded_menu').fadeOut(200);
			$('#edit_menu_div').fadeOut(200);
			$('#color_picker_div').fadeOut(200);
			$('#edit_note').fadeOut(200);
		}, 200);

		//show menu
		$('#menu').fadeIn(200);

		//update rendered note
		if($('#edit_note').val() !== "") $('#rendered_note').html(md.render($('#edit_note').val()));
		else  $('#rendered_note').html("<font size='2px' color='#AAA'>To edit, you can click here, or use the 'Edit' icon to enter edit mode.</font>");

		//hide all menus
		hideAuxMenus();

		//turn off delete mode in todo mode
		turnDeleteModeOff();
		
		//update appearence
		applyCSS();

	});


	//delete current note from edit menu
	$('#b_edit_menu_delete').click(function (e) {
	  	deleteMe();
	});

	//delete from unlock ui
	$('#security_menu_delete').click(function (e) {
		deleteMe();
	});

	//delete from expanded menu
	$('#b_edit_menu_delete_expanded_menu').click(function (e) {
		deleteMe();
	});

	//sync current note
	$('#b_sync').click(function (e) {
	 	var remote = require('electron').remote;

	 	//check if logged in
		if(remote.getGlobal('login').eemail === 'skipped' || remote.getGlobal('login').eemail === null) isLoggedIn = false;
		else isLoggedIn = true;

		if(isLoggedIn){
			$('#b_sync').fadeOut(400);

			$('#b_sync').attr("src","img/busy.png");
			$('#b_sync').fadeIn(100);

		  	//send sync IPC
		 	sendSyncIPC(mode);
		 
			ipcRenderer.on('sync', function(event, arg) {
				if(arg == 1){

					popup("Note synced to cloud.");

					$('#b_sync').fadeIn(400);
					setTimeout(function(){	
						$('#b_sync').attr("src","img/done.png");
					}, 400);

					setTimeout(function(){
						$('#b_sync').fadeOut(400);
						
						setTimeout(function(){
							$('#b_sync').fadeIn(400);
						}, 400);

						setTimeout(function(){
							$('#b_sync').attr("src","img/sync.png");
						}, 400);

					}, 2000);
				}	
			});
		}
		else{

			setTimeout(function(){
				$('#b_sync').attr("src","img/sync.png");
			}, 400);

			popup("You should be signed in to enable sync.");

			$('#user_login_menu').removeClass('hidden');
			$('#user_login_menu').fadeOut(0);
			setTimeout(function(){
				$('#user_login_menu').fadeIn(200);
			}, 300);
		}
	});

	//sync from expanded menu
	$('#b_sync_expanded_menu').click(function (e) {
	 	var remote = require('electron').remote;
		if(remote.getGlobal('login').eemail === 'skipped' || remote.getGlobal('login').eemail === null) isLoggedIn = false;
		else isLoggedIn = true;

		if(isLoggedIn){
			$('#b_sync_expanded_menu').fadeOut(400);

			$('#b_sync_expanded_menu').attr("src","img/busy.png");
			$('#b_sync_expanded_menu').fadeIn(100);

		  	//send sync IPC
		 	sendSyncIPC(mode);
		 
			ipcRenderer.on('sync', function(event, arg) {
				if(arg == 1){

					popup("Note synced to cloud.");

					$('#b_sync_expanded_menu').fadeIn(400);
					setTimeout(function(){	
						$('#b_sync_expanded_menu').attr("src","img/done.png");
					}, 400);

					setTimeout(function(){
						$('#b_sync_expanded_menu').fadeOut(400);
						
						setTimeout(function(){
							$('#b_sync_expanded_menu').fadeIn(400);
						}, 400);

						setTimeout(function(){
							$('#b_sync_expanded_menu').attr("src","img/sync.png");

							setTimeout(function(){
								$('#expanded_menu').fadeOut(200);
								toggle_menu = true;
							}, 1200);

						}, 400);

					}, 2000);
				}	
			});
		}
		else{

			setTimeout(function(){
				$('#b_sync_expanded_menu').attr("src","img/sync.png");
			}, 400);

			popup("You should be signed in to enable sync.");

			$('#user_login_menu').removeClass('hidden');
			$('#user_login_menu').fadeOut(0);
			setTimeout(function(){
				$('#user_login_menu').fadeIn(200);
			}, 300);
		}
	});

	//show user menu from edit menu
	$('#b_edit_menu_user').click(function (e) {
		//check if logged in
		if(remote.getGlobal('login').eemail === 'skipped' || remote.getGlobal('login').eemail === null) isLoggedIn = false;
		else isLoggedIn = true;

		if(isLoggedIn){
			//get user email
			user_id = remote.getGlobal('login').email;

			//change ui
			if(user_id !== 'empty' || user_id !== 'skipped') $('#user_id').text(user_id);

			$('#user_menu').removeClass('hidden');
			$('#user_menu').fadeOut(0);

			$('#user_menu').fadeIn(200);
		}
		else{
			$('#user_login_menu').removeClass('hidden');
			$('#user_login_menu').fadeOut(0);

			$('#user_login_menu').fadeIn(200);
		}
	});

	//close user menu
	$('#b_user_menu_back').click(function (e) {
		$('#user_menu').fadeOut(200);

		//get user email
		user_id = remote.getGlobal('login').email;

		//change ui
		if(user_id !== 'empty' || user_id !== 'skipped') $('#user_id').text(user_id);

		setTimeout(function(){
			$('#user_menu').addClass('hidden');
		}, 200);
	});

	//close user login menu
	$('#b_user_login_menu_back').click(function (e) {
		$('#user_login_menu').fadeOut(200);
		setTimeout(function(){
			$('#user_login_menu').addClass('hidden');
		}, 200);
	});

	//log out from user menu
	$('#b_user_menu_log_out').click(function (e) {
		$('#user_menu').fadeOut(200);
		
		setTimeout(function(){
		 	var remote = require('electron').remote;

			remote.getGlobal('logout').initiate = true;
			var ipcRenderer = require('electron').ipcRenderer;   
			ipcRenderer.send('logout');

		}, 200);
	});

	//log in from user login menu (login post)
	$('#b_user_login_menu_log_in').click(function (e) {
		$('#user_login_menu').fadeOut(200);

		setTimeout(function(){
			var ipcRenderer = require('electron').ipcRenderer;   
			ipcRenderer.send('login_post');
		}, 200);
	});

	//listen for logout initiation
	var ipcRenderer = require('electron').ipcRenderer;   
 
	ipcRenderer.on('logout', function(event, arg) {
		if(arg == 1 && remote.getGlobal('logout').initiate){
			popup("Successfully logged out.")
			
			isLoggedIn = false;
		}	
	});

	//change theme color
	$("#b_edit_menu_color").spectrum({
	    showPaletteOnly: true,
	    showPalette:true,
	    cancelText: 'Cancel',
	    showAlpha: false,
	    showButtons: true,
	    chooseText: "Select",
	    palette: [
	        ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
	        ["#f00","#f90","#ff0","#0f0","#128C7E","#00f","#90f","#f0f"],
	        // ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
	        // ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
	        ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
	        ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
	        ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
	        ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
	    ],
	    change: function (color) {
	        setColor(color.toHexString());

			accent = color.toHexString();

			//change appearence
			applyCSS();

			//update note
			sendUpdateIPC();
	    }
	});


	//add a new note from menu
	$('#b_add').click(function (e) {
		createNote();
	});

	//add a new note from expanded menu
	$('#b_add_expanded_menu').click(function (e) {
		createNote();
	});



	/*
	----------------------	Mouseover functions ---------------------
	*/
	$('#accentBar').mouseover(function() {
	  $('#accentBarMover').slideDown();
	});

	$('#accentBar').mouseout(function() {
	  $('#accentBarMover').slideUp();
	});
	

	/*
	----------------------	Popup functions ---------------------
	*/

	function popup(data){
		$("#popup").slideDown().delay(1500).html(data).delay(100).slideUp();
		setTimeout(function(){
			$("#popup").html('');
		},2500);
	}

	var popup_toggle = false;
	function popupPersistent(data, cancellable, callback){
		$("#popup").css('display', 'inline-block');
		$("#popup").html(`
			<table border="0" width="92%" valign="middle" style="margin: 4px;">
				<tr>
					<td style="text-align: justify;">` + data + `</td>
				</tr>
			</table>
			<div><button id="proceedPopup">Okay</button></div>`);
		if(cancellable){
			$("#popup").html(`
			<table border="0" width="92%" valign="middle" style="margin: 4px;">
				<tr>
					<td style="text-align: justify;">` + data + `</td>
				</tr>
			</table>
			<div style="display: inline-block;">
				<button style="float: left;" id="proceedPopup">Okay</button>
				<button style="float: right;" id="cancelPopup">Cancel</button>
			</div>`);
		}

		$('#proceedPopup').css('background', accent);
		$('#cancelPopup').css('background', accent);

		popup_toggle = true;

		$("#proceedPopup").click(function(){
			$("#popup").slideDown().delay(100).slideUp();
			callback(true);
			setTimeout(function(){
				$("#popup").html('');
				popup_toggle = false;
			},2000);
		});


		$("#cancelPopup").click(function(){
			$("#popup").slideDown().delay(100).slideUp();
			callback(false);
			setTimeout(function(){
				$("#popup").html('');
				popup_toggle = false;
			},2000);
		});


	}
	

	/*
	----------------------	Debug functions & Maths functions ---------------------
	*/



	function l(data, label){
		if(remote.getGlobal('debug').on) console.log(label + ": " + typeof(data) + ": " + data);
	}	


	function r(){
		return Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000;
	}

	
    Mousetrap.bind('alt+r', function() { 
		window.setTimeout(function (){
    		if(getGlobal('debug').on){} window.location.reload()
    	},0);
    });


  	// change size of the window
    Mousetrap.bind('alt+shift+c', function() { 
		const remote = require('electron').remote;
		var win = remote.getCurrentWindow();
		for(var i = 0; i < 200; i++) win.setSize(width + i, height);
    });



	/*
	----------------------	template menu operations ---------------------
	*/


	var template_menu_toggle = false;
	$("#b_insert").click(function(){
		if(!template_menu_toggle) $('#template_menu').slideDown();
		else $('#template_menu').slideUp();
		template_menu_toggle = !template_menu_toggle;
	});

	$("#b_href").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('href'));
		sendUpdateIPC('text');
	});

	$("#b_heading").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('heading'));
		sendUpdateIPC('text');
	});


	$("#b_image").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('image'));
		sendUpdateIPC('text');
	});

	$("#b_hr").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('hr'));
		sendUpdateIPC('text');
	});

	$("#b_text_format").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('text_format'));
		sendUpdateIPC('text');
	});

	$("#b_table").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('table'));
		sendUpdateIPC('text');
	});

	$("#b_blockquote").click(function(){
		$('#edit_note').val($('#edit_note').val() + getTemplate('blockquote'));
		sendUpdateIPC('text');
	});


	function getTemplate(category){
		if(category === 'table') template = `

| heading_1         | heading_2         |
| ---------------------- |:---------------------:|
| row_1_col_1     | row_1_col_2     |
`;
		else if(category === 'href') template = `
[Google](https://www.google.com)
`;
		else if(category === 'image') template = `
![alt_text](https://github.com/piyushagade/Psyc/blob/master/img/icon_color.png?raw=true)
`;
		else if(category === 'hr') template = `
---
`;
		else if(category === 'heading') template = `
# H1
## H2
### H3
#### H4
`;
		else if(category === 'blockquote') template = `
> In war, truth is the first casualty
> ~Anonymous
`;
		else if(category === 'text_format') template = `
*italics*
**bold**
~~striked~~
`;
		
		return template;
	}

	

	/*
	----------------------	keyboard menu operations ---------------------
	*/


	var keyboard_menu_toggle = false;
	$("#b_keys_expanded_menu").click(function(){
		if(!keyboard_menu_toggle) $('#keyboard_menu').slideDown();
		else $('#keyboard_menu').slideUp();
		keyboard_menu_toggle = !keyboard_menu_toggle;
	});

	

	/*
	----------------------	security menu operations ---------------------
	*/


	var security_menu_toggle = false;
	$('#b_secure').click(function(){
		// show security menu
		if(!security_menu_toggle && !protected) {
			$('#security_menu').slideDown();
			$('#pin_security_menu').css('border-color', accent);
			$('#pin_security_menu').css('color', accent);
		}
		// turn off protection
		else if(protected) {

			protected = false;
			pin = ""

			//update note
			sendUpdateIPC();
		 
			var k = 0;
			ipcRenderer.on('ren_to_main_data', function(event, arg) {
				if(arg==1 && k == 0){
					popup('Security turned off.');
					$('#b_secure').attr("src","img/secure.png");
					$('#security_menu').slideUp();

					security_menu_toggle = false;
					k++;
				}	
			});
		}

		security_menu_toggle = !security_menu_toggle;
	});

	//unlock note
	$('#pin_unlock').click(function(){
		if($('#pin_code').val().trim().length === 4 && $('#pin_code').val().trim() === pin.trim()){
			$('#curtain').fadeOut(600);
		}
		else if($('#pin_code').val().trim().length === 4 && $('#pin_code').val().trim() !== pin.trim())
			popup("Wrong PIN entered. Try again.");
		else popup("Enter the 4 digit PIN to unlock");
		
		setTimeout(function(){
			$('#pin_code').val('');
		}, 2000);
	});

	//turn on protection
	$('#pin_set').click(function(){
		var local_pin = $("#pin_security_menu").val();
		$("#pin_security_menu").val('');
		$("#pin_security_menu").val('');

		if(local_pin !== '' && local_pin.length === 4){
			pin = local_pin;

			//update note
			sendUpdateIPC();
		 	
			var k = 0;
			ipcRenderer.on('ren_to_main_data', function(event, arg) {
				if(arg==1 && k++ == 0){
					popupPersistent('PIN has been set. You will be asked to enter the PIN at startup. <br><br><b>Note:</b> The PIN is associated only with this note.', false, null);
					
					$('#b_secure').attr("src","img/secured.png");
					$('#security_menu').slideUp();
					protected = true;
				}	
			});
		}
		else popup('Enter a 4-digit PIN.');
	});

	//close security menu
	$('#pin_back').click(function(){
		$('#security_menu').slideUp();
		security_menu_toggle = false;
	});

	//auto lock after 5 minutes of inactivity
	var idleTime = 0;
	$(document).ready(function () {
	    //Increment the idle time counter every minute.
	    var idleInterval = setInterval(timerIncrement, 60000); // 1 minute

	    //Zero the idle timer on mouse movement.
	    $(this).mousemove(function (e) {
	        idleTime = 0;
	    });
	    $(this).keypress(function (e) {
	        idleTime = 0;
	    });
	});

	function timerIncrement() {
	    idleTime = idleTime + 1;
	    if (idleTime > 4 && protected) { // 20 minutes
	        $('#curtain').fadeIn(400);
	    }
	}
	

	/*
	----------------------	mouse trap ---------------------
	*/

 	// create new note
    Mousetrap.bind('alt+a', function() { 
      createNote();
    });

    //show keyboard shortcuts
    Mousetrap.bind('alt+k', function() { 
      if(!keyboard_menu_toggle) $('#keyboard_menu').slideDown();
		else $('#keyboard_menu').slideUp();
		keyboard_menu_toggle = !keyboard_menu_toggle;
    });

    //toggle edit mode in text mode by alt+enter
    var edit_toggle = true;
    Mousetrap.bind('alt+enter', function() { 
    	if(mode === 'text'){
			if(edit_toggle && mode === 'text'){
				setTimeout(function() { 
				    $('#menu').fadeOut(200);
				}, 200);

				//switch to edit menu helper
				switchEditMenuHelper();
			}
			else{
				setTimeout(function() { 
				  $('#edit_menu_div').fadeOut(200);
				  $('#color_picker_div').fadeOut(200);
				  $('#edit_note').fadeOut(200);
				}, 200);

				//show menu
				$('#menu').fadeIn(200);

				//update rendered note
				if($('#edit_note').val() !== "") $('#rendered_note').html(md.render($('#edit_note').val()));
				else  $('#rendered_note').html("<font size='2px' color='#AAA'>To edit, you can click here, or use the 'Edit' icon to enter edit mode.</font>");
			}
			edit_toggle = !edit_toggle;
		}
		else if(mode === 'todo'){
			setTimeout(function() {	
				$('#menu').fadeOut(200);
			}, 200);
			$('#edit_menu_div').fadeIn(200);
			$('#color_picker_div').fadeIn(200);
			edit_toggle = !edit_toggle;
		}
      });

    //focus on todo input by pressing tab
    Mousetrap.bind('tab', function() { 
        //request focus
		window.setTimeout(function ()
    	{
    		$("#new_li").focus();
    	},0);
    });

    //lock note
    Mousetrap.bind('alt+l', function() { 
		if (protected) {
	        $('#curtain').fadeIn(400);
	    }
	    // show security menu
		if(!protected) {
			$('#security_menu').slideDown();
			$('#pin_security_menu').css('border-color', accent);
			$('#pin_security_menu').css('color', accent);
			security_menu_toggle = true;

			popup('Set a PIN first.');
		}
    });

    //switch grid view
    Mousetrap.bind('alt+v', function() { 
    	if(mode === 'todo'){
			if(!grid_toggle) {
				goGrid();
			}
			else {
				noGrid();
			}
			sendUpdateIPC('todo');
		}
    });

    //enter key listener
    window.enterKeyEvent = function(obj, e) {
	  	var keynum, lines = 1;
	    // IE
	    if(window.event) {
	      keynum = e.keyCode;
	    // Netscape/Firefox/Opera
	    } else if(e.which) {
	      keynum = e.which;
	    }

	    if(keynum == 13) {
	    	//add item in todo list
	        if(mode === 'todo' && $("#new_li").val().trim() !== ''){
		      	todo_count++;

				todo_object.data.push({
					'id' : r(),
					'item' : $('#new_li').val(),
					'marked' : false,
				});

				var local_important = false;
				if($('#new_li').val().trim().charAt(0) === '!') local_important = true;
				
				if(!local_important) $('#ol').append('<li><span class="un_item_unimportant">' + $('#new_li').val() + '</span></li>');
				else {
					$('#ol').append('<li><span class="un_item_important"><font style="display: none;">!</font>' + $('#new_li').val().slice(1) + '</span></li>');
					
					priority_object.data.push({
						'id' : r(),
						'item' : $('#new_li').val().slice(1),
					});
				}

				$('#new_li').val('');

				$("#empty_ol").addClass('hidden');
				$("#ol").removeClass('hidden');

				if(grid_toggle) goGrid();
				else noGrid();

				//update note
				sendUpdateIPC('todo');


				//turn off delete item mode
				turnDeleteModeOff();

				//exit edit mode
				exitEditMode();

				$("#new_li").focus();
				return true;
		    }
    	}
  	}

	//exit edit mode
  	function exitEditMode(){
		setTimeout(function() {	
			$('#edit_menu_div').fadeOut(200);
			$('#color_picker_div').fadeOut(200);
			$('#edit_note').fadeOut(200);
		}, 200);

		//show menu
		$('#menu').fadeIn(200);
  	}


  	//handle focus and blur for keyshortcuts
  	document.onkeydown = keydown;
  	document.onkeyup = keyup;

	function keydown(evt) {
	    if (!evt) evt = event;
	    if (evt.altKey) {
    		$('input').blur();
    		$('textarea').blur();
	    }
	} 

	function keyup(evt) {
	    if (!evt) evt = event;
	    var KeyID = (window.event) ? event.keyCode : evt.keyCode;

	    if (KeyID === 18) {
			window.setTimeout(function (){
	    		$("#new_li").focus();
	    	},0);
	    }
	    else if (KeyID === 27) {
			window.setTimeout(function (){
				//exit edit mode
				setTimeout(function() {	
					$('#edit_menu_div').fadeOut(200);
					$('#color_picker_div').fadeOut(200);
					$('#edit_note').fadeOut(200);
				}, 200);

				//show menu
				$('#menu').fadeIn(200);

				//update rendered note
				if($('#edit_note').val() !== "") $('#rendered_note').html(md.render($('#edit_note').val()));
				else  $('#rendered_note').html("<font size='2px' color='#AAA'>To edit, you can click here, or use the 'Edit' icon to enter edit mode.</font>");

				//hide all menus
				hideAuxMenus();

				//turn delete mode off
				turnDeleteModeOff();

			}, 200);  		
	    }
	    else if (KeyID === 32) {
			window.setTimeout(function (){
				if(popup_toggle){
					$("#popup").slideDown().delay(100).slideUp();
					popup_toggle = false;
				}
			}, 100);  		
	    }
	} 



	//monitor window dimensions
	var old_height = $(window).height();
	var old_width = $(window).width();

	setInterval(function(){
		setTimeout(function(){
			var remote = require('electron').remote;
			var d = new Date();
	    	var n = d.getTime();

	    	if(old_width !== $(window).width() ||
	    		old_height !== $(window).height()){
	    		sendUpdateIPC(mode);
	    		old_width !== $(window).width();
	    		old_height !== $(window).height();
	    	}
		}, 10000);
	}, 5000);



	//Priority list functions
	var audioElement = new Audio("");

        //clock plugin constructor
        $('#myclock').thooClock({
            size:$(document).height()/1.4,
            
            onAlarm:function(){
                //all that happens onAlarm

                var array = priority_object.data;
                l(array.length, "Priority object count");

                setTimeout(function(){
                	var html = "<font class='today_heading'><center>Today</center></font><ol style=''>";
	                for (var j = 0; j < array.length; j++){
	                	// html += '<li id="priority_' + j + '"  class="today_ol_li">' + 'Piyush Agade' + '</li>';
	                	html += '<li id="priority_' + j + '"  class="today_ol_li">' + array[j].item + '</li>';
	                }
	                html += '</ol>'
	                
	                if(array.length > 0) popupPersistent(html, false, function(){});
                }, 500);
                

                //audio element just for alarm sound
                document.body.appendChild(audioElement);
                var canPlayType = audioElement.canPlayType("audio/ogg");
                
                if(canPlayType.match(/maybe|probably/i)) {
                    audioElement.src = 'assets/chime.ogg';
                } else {
                    audioElement.src = 'assets/chime.mp3';
                }
                // erst abspielen wenn genug vom mp3 geladen wurde
                audioElement.addEventListener('canplay', function() {
                    audioElement.loop = false;
                    setTimeout(function(){
                    	if(array.length > 0) audioElement.play();
                	}, 900);
                }, false);
            },

            showNumerals:true,
            brandText:'Pysc',
            brandText2:'Clock',
            
            onEverySecond:function(){
                //callback that should be fired every second
                var array = priority_object.data;
                // l(array.length, "Priority object count");
            },
            offAlarm:function(){
                audioElement.pause();
                // clearTimeout(intVal);
                // $('body').css('background-color','#FCFCFC');
            }
        });



    $('#turnOffAlarm').click(function(){
        $.fn.thooClock.clearAlarm();
    });


	var alarm_time = '02:56';

    //Set alarm
	$.fn.thooClock.setAlarm(alarm_time);
    

});

