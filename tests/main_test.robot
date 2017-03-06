*** Variables ***
${url}                     ws://localhost:8080
${url_params}              ?pass=30022
${uri_client}              ${url}/client${url_params}
${uri_camera}              ${url}/camera${url_params}
${cloud_path}               ../
${cloud_app}                npm start --prefix  ${cloud_path}
${outf}                    log/stdout.txt
${errf}                    log/stderr.txt


*** Settings ***
Library           lib/WebsocketLibrary.py
Library           OperatingSystem
Library           Process
Suite Setup       Run Cloud
Suite Teardown    Terminate All Processes    kill=True

*** Keywords ***
Run Cloud
    Start Process               ${cloud_app}   alias=cloud_process  stdout=${outf}  stderr=${errf}  shell=True
    sleep   1
    ${is_running} =             Is Process Running  handle=cloud_process
    Should Be True              ${is_running}   msg=Cloud is not running
#    ${result} =                 Wait For Process         timeout=1s  on_timeout=kill
Wait To Receive Message
    [arguments]   ${message}  ${socket}
    ${received}   Wait Until Keyword Succeeds  2x  200 ms  Receive Next Message  ${socket}
    Should Be Equal  ${received}   ${message}  msg=Received ${received}, but ${message} was expected

*** Test Cases ***
#Check node.js instance is working
#    Run Cloud
#    ${result} =                 Wait For Process         timeout=1s  on_timeout=kill
#    Process should Be Stopped
#    Should Contain              ${result.stdout}  running

Check Socket Library works
    Create Socket                client0  ${uri_client}
    Do Exist Socket             client0

Create 2 sockets
    Create Socket                client0  ${uri_client}
    Create Socket                client1  ${uri_client}

Camera to Client
    Create Socket                client0  ${uri_client}
    Create Socket                camera0  ${uri_camera}

    send to socket               camera0  hello_handsome
    Wait To Receive Message      hello_handsome  client0

Camera to several clients
    Create Socket                client0  ${uri_client}
    Create Socket                client1  ${uri_client}
    Create Socket                client2  ${uri_client}
    Create Socket                camera0  ${uri_camera}

    ${message}  Set Variable        hello to all

    send to socket               camera0  ${message}
    Wait To Receive Message      ${message}  client0
    Wait To Receive Message      ${message}  client1
    Wait To Receive Message      ${message}  client2


