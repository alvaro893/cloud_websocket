$(document).ready(function(){
    var sizex = 400;
    var sizey = 300;
    var image = "cam";
    var currentCam = "RESTAURANT1";
    
    refresh_list();
    $('#refresh').on('click', refresh_list);
    $('#cam').on('click', function(){image="cam"; setCamera();});
    $('#mask').on('click', function(){image="mask"; setCamera();});
    $('#heatmap').on('click', function(){image="heatmap"; setCamera();});
    $('#plus').on('click', function(){sizex +=50; sizey+=50; setCamera();});
    $('#minus').on('click', function(){sizex -=50; sizey-=50; setCamera();});
    

    function setCamera(){
        $("#video_feed").attr("src", "/cameras/"+currentCam+"/"+image+".mjpg?sizex="+sizex+"&sizey="+sizey);
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