$(document).ready(function(){
    var sizex = 400;
    var sizey = 300;
    var image = "cam";
    var currentCam = "RESTAURANT1";
    setCamera();

    refresh_list();
    $('#refresh').on('click', refresh_list);
    $('#cam').on('click', function(){image="cam"; setCamera();});
    $('#mask').on('click', function(){image="mask"; setCamera();});
    $('#heatmap').on('click', function(){image="heatmap"; setCamera();});
    $('#background').on('click', function(){image="background"; setCamera();});
    $('#plus').on('click', function(){sizex = 800; sizey = 600; setCamera();});
    $('#minus').on('click', function(){sizex =400; sizey =300; setCamera();});
    $('#calibrate').on('click', function(){sendCommand('calibrate', $('#calibrate') );});
    $('#sync').on('click', function(){sendCommand('sync', $('#sync') );});
    $('#automax').on('click', function(){sendCommand('automax', $('#automax') );});
    $('#automin').on('click', function(){sendCommand('automin', $('#automin') );});
    $('#delay').on('click', function(){
        sendCommand('delay', $('#delay_input'));
    });
    $('#min_temp').on('click', function(){
        sendCommand('min', $('#min_temp_input'));
    });
    $('#max_temp').on('click', function(){
        sendCommand('max', $('#max_temp_input'));
    });
    

    function setCamera(){
        $("#video_feed").attr("src", "/cameras/"+currentCam+"/"+image+".mjpg?sizex="+sizex+"&sizey="+sizey);
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
            // var data = {"cams":[{"name":"RESTAURANT1","ip":"10.23.178.138, 192.168.0.59"},{"name":"LOBBY2","ip":"10.23.178.134, 192.168.0.59"},{"name":"LOBBY1","ip":"10.23.178.133, 192.168.0.59"},{"name":"TESTING_CAMERA","ip":"10.23.178.129, 192.168.0.59"},{"name":"GARAGE1","ip":"10.23.178.141, 192.168.0.59"},{"name":"RESTAURANT2","ip":"10.23.178.139, 192.168.0.59"}],"count":6}
            $.each(data.cams, function(i, camera){
                var item = $("<li>" +camera.name+ ": "+camera.ip+" </li>");
                item.addClass(camera.name);
                item.on('click',function(){currentCam = camera.name; setCamera();});
                item.appendTo($("#cameras"));
            });
        });
    }
});