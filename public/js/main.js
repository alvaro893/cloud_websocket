/* jshint browser: true */
$(document).ready(function(){
    var sizex = 400;
    var sizey = 300;
    var image = "cam";
    var currentCam = "RESTAURANT1";
    var currentIp = "0";
    setCamera();

    refresh_list();
    $('#refresh').on('click', refresh_list);
    $('#cam').on('click', function(){image="cam"; setCamera();});
    $('#mask').on('click', function(){image="mask"; setCamera();});
    $('#heatmap').on('click', function(){image="heatmap"; setCamera();});
    $('#background').on('click', function(){image="background"; setCamera();});
    $('#plus').on('click', function(){sizex = 800; sizey = 600; setCamera();});
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
    $('#reboot').on('click', function(){
        sendCommand('reboot', $(this));
    });
    $('#update').on('click', function(){
        sendCommand('update', $(this));
    });
    

    function setCamera(){
        var video_feed = document.getElementById("video_feed");
        video_feed.src = "/img/wait.png";
        video_feed.addEventListener('error', function imgOnError() {
            video_feed.src = "/img/error.png";
        })
        setTimeout(function(){
            // video_feed.src = "http://"+currentIp+":8088/"+image+".mjpg?sizex="+sizex+"&sizey="+sizey + "#" + new Date().getTime();
            video_feed.src = "/cameras/"+currentCam+"/"+image+".mjpg?sizex="+sizex+"&sizey="+sizey + "#" + new Date().getTime();
            document.getElementById("buildlog").href = "/cameras/"+currentCam+"/build.log";
            document.getElementById("generallog").href = "/cameras/"+currentCam+"/logs.log";
        }, 300);
    }

    function sendCommand(comm, $input){
        $.ajax({
            type: 'PUT',
            url: "/cameras/"+currentCam+"/"+comm, 
            data: $input.val() || "",
            contentType: 'text/plain'
        }).done(function(d) {
            if($input){$input.css({'background-color': '#89ff89'});}
          })
          .fail(function() {
            if($input){$input.css({'background-color': '#ff9c9c'});}
          });
    }

    function refresh_list(){
        $("#cameras").empty();
        $.getJSON("/cams", function(data){
            // var data = {"cams":[{"name":"RESTAURANT1","ip":"10.23.178.134"},{"name":"LOBBY2","ip":"10.23.178.135"},{"name":"LOBBY1","ip":"10.23.178.136"},{"name":"TESTING_CAMERA","ip":"10.23.178.129, 192.168.0.59"},{"name":"GARAGE1","ip":"10.23.178.138"},{"name":"RESTAURANT2","ip":"10.23.178.128"}],"count":6}
            $.each(data.cams, function(i, camera){
                var item = $("<li>" +camera.name+ ": "+camera.ip+" </li>");
                item.addClass(camera.name);
                item.on('click',function(){currentCam = camera.name; currentIp = camera.ip; setCamera();});
                item.appendTo($("#cameras"));
            });
        });
    }
});