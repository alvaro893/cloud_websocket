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
Test Teardown     sleep  200 ms

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
    Wait Until Keyword Succeeds  5x  5 ms  Receive Next Message   ${socket}  ${message}
Wait Until Queue
    [arguments]   ${socket}   ${n}
    Wait Until Keyword Succeeds   5x  50 ms  Messages In Queue Should Be   ${socket}   ${n}
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
close sockets
    create Camera Socket         camera0
    Create Client Socket         client          camera0
    sleep                                100 ms
    Close Socket                 client
    Create Client Socket         client2          camera0
    sleep                                100 ms
    Close Socket                 client2


Check Socket Library works
    Create Socket                client0  ${uri_camera}
    Do Exist Socket             client0

Create camera client and send
    Create Camera Socket         camera0
    Create Client Socket         client0  camera0
    send From Socket             camera0  hi
    send From Socket             client0  hello

# Create camera, client, send and receive
#     Create Camera Socket         camera0
#     Create Client Socket         client0  camera0
#     send From Socket             camera0  hi client
#     send From Socket             client0  hello camera

#     Wait To Receive Message      client0  hi client
#     Wait To Receive Message      camera0  hello camera

# 1 camera, several clients
#     Create Camera Socket         camera0
#     Create Client Socket         client0  camera0
#     Create Client Socket         client1  camera0
#     Create Client Socket         client2  camera0
#     sleep   100 ms
#     send From Socket             camera0  hi clients
#     send From Socket             client0  hello camera

#     Wait To Receive Message      camera0  hello camera
#     Wait To Receive Message      client0  hi clients
#     Wait To Receive Message      client1  hi clients
#     Wait To Receive Message      client2  hi clients

5 cameras, 1 client, 5 messages
    create Camera Socket         camera0
    create Camera Socket         camera1
    create Camera Socket         camera-special
    create Camera Socket         camera3
    create Camera Socket         camera4
    Create Client Socket         client          camera-special
    sleep                                100 ms

    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Send Random Message From             camera-special
    Wait Until Queue          client   5



several cameras with several clients, bidirectional communication
    Create Camera Socket        cam
    Create Camera Socket        camf
    Create Client Socket        client       cam
    Create Client Socket        client1      cam
    Create Client Socket        client2      camf
    Create Client Socket        client3      camf
    sleep                                100 ms

    Send Random Message From             cam
    Send Random Message From             camf

    Wait Until Queue          client    1
    Wait Until Queue          client1   1
    Wait Until Queue          client2   1
    Wait Until Queue          client3   1

    Send Random Message From             client
    Send Random Message From             client1
    Send Random Message From             client2
    Send Random Message From             client3

    Wait Until Queue          cam       2
    Wait Until Queue          camf      2

