*** Settings ***
Documentation    Suite description

*** Variables ***


*** Test Cases ***
Condition
    Should Be True       True
Contain
    Should Contain              [1,2,3,4]    4
    Should Contain Any          [1,2,3,4]    1      2       4
    Should Not Contain          [1,2,3,4]    1000
Conversion
    Check Hex   255  FF
    Check Hex   240  F0
Call method
    Check Upper method      asdf   ASDF
Counting
    Count charaters  hola
    Should Count Be   4
Logging
    Log  Hello World




*** Keywords ***
Check Hex
    [arguments]   ${value}   ${expected}
    ${result}    Convert To Hex  ${value}
    Should Be Equal  ${result}   ${expected}
Check Upper method
    [arguments]   ${value}  ${expected}
    ${result}  Call Method   ${value}  upper
    Should Be Equal  ${result}   ${expected}

Count charaters
    [arguments]  ${countable}
    ${COUNT} =   Get Length   ${countable}
    Set Test Variable    ${COUNT}

Should Count Be
    [arguments]  ${expected}
    ${expected}  Convert To Integer  ${expected}
    Should Be Equal  ${expected}  ${COUNT}



