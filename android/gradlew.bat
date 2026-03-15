@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem ... (standard gradlew header)
@echo off

@rem Set GRADLE_USER_HOME to a local directory to avoid permission issues in C:\Program Files
set GRADLE_USER_HOME=%~dp0.gradle_home

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem ... (rest of the standard gradlew.bat file)
