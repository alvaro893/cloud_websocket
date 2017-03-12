*** Variables ***
${password}                30022
${url}                     ws://localhost:8080
${camera_name_param}           camera_name=
${url_params}              ?pass=${password}
${uri_client}              ${url}/client${url_params}&${camera_name_param}
${uri_camera}              ${url}/camera${url_params}&${camera_name_param}
${cloud_path}               ../
${cloud_app}                npm start --prefix  ${cloud_path}
${outf}                    log/stdout.txt
${errf}                    log/stderr.txt


*** Settings ***
Library           lib/WebsocketLibrary.py
Library           OperatingSystem
Library           Process
Suite Setup       Run Cloud
Suite Teardown    Close Cloud
Test Teardown     sleep  100 ms

*** Keywords ***
Close cloud
    Terminate All Processes
Run Cloud
    Remove Files                ${outf}  ${errf}
    Set Environment Variable    WS_PASSWORD  30022
    Start Process               ${cloud_app}   alias=cloud_process  stdout=${outf}  stderr=${errf}  shell=True
    sleep   1
    ${is_running} =             Is Process Running  handle=cloud_process
    Should Be True              ${is_running}   msg=Cloud is not running
#    ${result} =                 Wait For Process         timeout=1s  on_timeout=kill
Wait To Receive Message
    [arguments]   ${socket}  ${message}
    Wait Until Keyword Succeeds  5x  300 ms  Receive Next Message   ${socket}  ${message}
Create Camera Socket
    [arguments]   ${name}
    create socket  ${name}  ${uri_camera}${name}
Create Client Socket
    [arguments]   ${name}   ${camera_socket}
    create socket  ${name}  ${uri_client}${camera_socket}
Random Message
    ${randint}  Evaluate   str(random.randint(0, sys.maxint))   modules=random, sys
    [Return]   ${randint}
Send Random Message From
    [arguments]  ${socket}
    ${message}   Random Message
    Send From Socket  ${socket}  ${message}

*** Test Cases ***
Check Socket Library works
    Create Socket                client0  ${uri_camera}
    Do Exist Socket             client0

Create camera client and send
    Create Camera Socket         camera0
    Create Client Socket         client0  camera0
    send From Socket             camera0  hi
    send From Socket             client0  hello

Create camera, client, send and receive
    Create Camera Socket         camera0
    Create Client Socket         client0  camera0
    send From Socket             camera0  hi client
    send From Socket             client0  hello camera

    Wait To Receive Message      client0  hi client
    Wait To Receive Message      camera0  hello camera

1 camera, several clients
    Create Camera Socket         camera0
    Create Client Socket         client0  camera0
    Create Client Socket         client1  camera0
    Create Client Socket         client2  camera0
    send From Socket             camera0  hi clients
    send From Socket             client0  hello camera

    Wait To Receive Message      camera0  hello camera
    Wait To Receive Message      client0  hi clients
    Wait To Receive Message      client1  hi clients
    Wait To Receive Message      client2  hi clients

5 cameras, 1 client, 5 messages
    create Camera Socket         camera0
    create Camera Socket         camera1
    create Camera Socket         camera-special
    create Camera Socket         camera3
    create Camera Socket         camera4
    Create Client Socket         client          camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    sleep                                100 ms
    messages In Queue Should Be          client   5



Recive commands from clients to one camera
    Create Camera Socket        secondaryCamera
    Create Camera Socket        mainCamera
    Create Camera Socket        aCamera
    Create Client Socket        client      mainCamera

    ${command}   Random Message
    ${frame}     Random Message

    Send From Socket              mainCamera    ${frame}
    Wait To Receive Message       client        ${frame}

    Send From Socket              client        ${command}
    Wait To Receive Message       mainCamera    ${command}
