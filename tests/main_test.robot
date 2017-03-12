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
    Wait Until Keyword Succeeds  5x  100 ms  Receive Next Message   ${socket}  ${message}
Create Camera Socket
    [arguments]   ${name}
    create socket  ${name}  ${uri_camera}${name}
Create Client Socket
    [arguments]   ${name}   ${camera_socket}
    create socket  ${name}  ${uri_client}${camera_socket}
Random Message
    ${randint}  Evaluate   str(random.randint(0, sys.maxint))   modules=random, sys
    [Return]   ${randint}

*** Test Cases ***
#Check node.js instance is working
#    Run Cloud
#    ${result} =                 Wait For Process         timeout=1s  on_timeout=kill
#    Process should Be Stopped
#    Should Contain              ${result.stdout}  running

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

    Wait To Receive Message      camera0  hello camera
    Wait To Receive Message      client0  hi client




#Camera to Client with name
#    Create Camera Socket                cameraname
#    Create Client Socket                client     cameraname
#
#    send From Socket                      cameraname  hello_handsome
#    Wait To Receive Message             hello_handsome  client

#Camera to several clients with name
#    Create Socket                ${uri_camera}camera0829
#    Create Socket         client0  ${uri_client}camera0829
#    Create Socket         client1  ${uri_client}camera0829
#    Create Socket         client2  ${uri_client}camera0829
#
#    ${message}  Set Variable        hello to all
#    sleep  500ms
#    send From Socket               camera0829  ${message}
#    sleep  500ms
#    Wait To Receive Message      ${message}  client0
#    Wait To Receive Message      ${message}  client1
#    Wait To Receive Message      ${message}  client2
#
#Camera to several clients with Random messages
#    Create Camera Socket         camera0829
#    Create Client Socket         client0  camera0829
#    Create Client Socket         client1  camera0829
#    Create Client Socket         client2  camera0829
#
#    ${message}   Random Message
#    send From Socket               camera0829  ${message}
#    Wait To Receive Message      ${message}  client0
#    Wait To Receive Message      ${message}  client1
#    Wait To Receive Message      ${message}  client2
#    ${message}   Random Message
#    send From Socket               camera0829  ${message}
#    Wait To Receive Message      ${message}  client0
#    Wait To Receive Message      ${message}  client1
#    Wait To Receive Message      ${message}  client2
#
#Recive commands from clients to one camera
#    Create Camera Socket        secondaryCamera
#    Create Camera Socket        mainCamera
#    Create Camera Socket        aCamera
#    Create Client Socket        client      mainCamera
#
#    ${command}   Random Message
#    ${frame}     Random Message
#
#    Send From Socket              mainCamera    ${frame}
#    Wait To Receive Message     ${frame}    client
#
#    Send From Socket              client        ${command}
#    Wait To Receive Message     ${command}    mainCamera
