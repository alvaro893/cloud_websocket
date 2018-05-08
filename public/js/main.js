/* jshint browser: true */
$(document).ready(function(){
    var sizex = 400;
    var sizey = 300;
    var image = "color";
    var currentCam = "";
    var currentIp = "0";
    var isCameraActive = false;
    var oldCameraList = [];

    // get the first camera
    refresh_list(function(){
        setTimeout(function(){
            var aCamera = $('#cameras li').get(0);
            if(aCamera){
                currentCam = aCamera.getAttribute('id');  setCamera();
            }    
        }, 500);
    });

    // refresh data
    window.setInterval(function(){
        if(isCameraActive){
            update_telemetry();
            update_data();
        }
    }, 2000);
    // refresh cameras
    window.setInterval(function(){ refresh_list();}, 10000);


    //buttons
    $('#refresh').on('click', refresh_list);
    $('#cam').on('click', function(){image="cam"; setCamera();});
    $('#color').on('click', function(){image="color"; setCamera();});
    $('#mask').on('click', function(){image="mask"; setCamera();});
    $('#heatmap').on('click', function(){image="heatmap"; setCamera();});
    $('#background').on('click', function(){image="background"; setCamera();});
    $('#plus').on('click', function(){sizex = 700; sizey = 500; setCamera();});
    $('#minus').on('click', function(){sizex =400; sizey =300; setCamera();});
    $('#calibrate').on('click', function(){sendCommand('calibrate', $(this) );});
    $('#sync').on('click', function(){sendCommand('sync',           $(this) );});
    $('#automax').on('click', function(){sendCommand('automax',     $(this) );});
    $('#automin').on('click', function(){sendCommand('automin',     $(this) );});
    $('#delay').on('click', function(){
        sendCommand('delay', $('#delay_input'));
    });
    $('#min_temp').on('click', function(){
        sendCommand('min', $('#min_temp_input'));
    });
    $('#max_temp').on('click', function(){
        sendCommand('max', $('#max_temp_input'));
    });
    $('#min_human_temp').on('click', function(){
        sendCommand('min_human_temperature', $('#min_human_temp_input'))
    });
    $('#max_human_temp').on('click', function(){
        sendCommand('max_human_temperature', $('#max_human_temp_input'))
    });
    $('#reboot').on('click', function(){
        if(confirm("Are you SURE?")){
            sendCommand('reboot', $(this));
        }
    });
    $('#update').on('click', function(){
        if(confirm("Are you SURE?")){
            sendCommand('update', $(this));
        }
    });
    
    function setCamera(){
        // select and restart all telelmetry
        var telemetry = $('span[id^="tel_"]*');
        for (var i = 0; i < telemetry.length; i++){ telemetry[i].innerHTML = "-"; }

        document.getElementById('camera_name').innerHTML = currentCam;
        document.getElementById('load').innerHTML =
        $.get("/cameras/"+currentCam+"/load", function(data){
            $('#load').html( "Average CPU Load (5 min) " + (data.split(" ")[1] / 4 * 100).toFixed(2) + " %");
        });
        var video_feed = document.getElementById("video_feed");
        video_feed.src = "/img/wait.png";
        video_feed.addEventListener('error', function imgOnError() {
            video_feed.src = "/img/error.png";
            isCameraActive = false;
        });
        // set video url and logs
        setTimeout(function(){
            // video_feed.src = "http://"+currentIp+":8088/"+image+".mjpg?sizex="+sizex+"&sizey="+sizey + "#" + new Date().getTime();
            video_feed.src = "/cameras/"+currentCam+"/"+image+".mjpg?sizex="+sizex+"&sizey="+sizey + "#" + new Date().getTime();
            document.getElementById("buildlog").href = "/cameras/"+currentCam+"/build.log";
            document.getElementById("generallog").href = "/cameras/"+currentCam+"/logs.log";
        }, 100);
        // copy telemetry to fields
        setTimeout(function(){
            $('#delay_input').val($("#tel_frame_delay").html());
            $('#min_temp_input').val($("#tel_raw_min_set").html());
            $('#max_temp_input').val($("#tel_raw_max_set").html());
            $('#min_human_temp_input').val($("#tel_min_human_temp").html());
            $('#max_human_temp_input').val($("#tel_max_human_temp").html());
        }, 2000);
        isCameraActive = true;
    }

    function sendCommand(comm, $input){
        $.ajax({
            type: 'PUT',
            url: "/cameras/"+currentCam+"/"+comm, 
            data: $input.val() || "",
            contentType: 'text/plain'
        }).done(function() {
            commandFeedback('#89ff89', $input);
        })
        .fail(function() {
            commandFeedback('#ff9c9c', $input);
        });
    }

    function commandFeedback(color, $input){
        var original = $input.css('background-color');
        $input.css({'background-color': color});
        setTimeout(function(){
            $input.css({'background-color': original});
        }, 1000); 
    }

    function refresh_list(callback){
        $.getJSON("/cams", function(data){
            // var data = {"cams":[{"name":"RESTAURANT1","ip":"10.23.178.134"},{"name":"LOBBY2","ip":"10.23.178.135"},{"name":"LOBBY1","ip":"10.23.178.136"},{"name":"TESTING_CAMERA","ip":"10.23.178.129, 192.168.0.59"},{"name":"GARAGE1","ip":"10.23.178.138"},{"name":"RESTAURANT2","ip":"10.23.178.128"}],"count":6}
            var newCameraList = data.cams;
            // update only whenever the list of cameras changes.
            listEquals(oldCameraList, newCameraList, function (isEqual) {
                if(!isEqual){
                    // list are not exactly the same, hence update it.
                       $("#cameras").empty();
                        $.each(newCameraList, function(i, camera){
                        var item = $('<li>' +camera.name+ ": "+camera.ip+" </li>");
                        item.attr({id: camera.name});
                        item.addClass('list-group-item');
                        item.on('click',function(){currentCam = camera.name; currentIp = camera.ip; setCamera();});
                        // item.appendTo($("#cameras"));
                        prependListItem('cameras', item);
                    });
                    oldCameraList = newCameraList;
                }
            });
            
        });
        if(typeof callback === "function"){ callback();}
    }

    function update_telemetry(){
        $.getJSON("/cameras/"+currentCam+"/telemetry", function(telemetry){
            $.each(telemetry, function(key, value) {
                switch(key){
                    case "center_temp": value = value / 100 + "&deg;C"; break;
                    case "coldest_temp": value = value / 100 + "&deg;C"; break;
                    case "hottest_temp": value = value / 100 + "&deg;C"; break;
                    case "agc":{
                     $("#min_auto_set").html((value & 1) == true);
                     $("#max_auto_set").html((value >> 1) == true);
                      break;
                    }
                }
                var element = document.getElementById("tel_"+key);
                if(element){
                    element.innerHTML = value;
                }
            })
        });
    }

    function update_data(){
        $.getJSON("/cameras/"+currentCam+"/analysis", function(analysis){
            $.each(analysis, function(key, value) {
                var element = document.getElementById("analysis_"+key);
                if(element){
                    element.innerHTML = value;
                }
            });

        });
    }

    function prependListItem(listName, listItemHTML){
        $(listItemHTML)
            .hide()
            // .css('opacity',0.0)
            .prependTo('#' + listName)
            .slideDown('slow')
            // .animate({opacity: 1.0})
    }
    function listEquals(list1, list2, callback){
        var counter = 0;
        if (list1.length !== list2.length){
            callback(false);
        }else{
            list1.forEach(el => {
                counter++;
                var included = list2.includes(el);
                var result = list2.map(x => x.name).indexOf(el.name);
                if(result == -1) {return false;}
                if(counter === list1.length){callback(true);}
            });
        }

    }

});