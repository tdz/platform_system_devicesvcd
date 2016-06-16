# Copyright (C) 2016 Mozilla Foundation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

LOCAL_PATH := $(call my-dir)

#
# Executable
#

devicesvcd_PATH := $(abspath $(LOCAL_PATH))

include $(CLEAR_VARS)
LOCAL_MODULE := devicesvcd
LOCAL_MODULE_CLASS := EXECUTABLES
LOCAL_MODULE_TAGS := optional
include $(BUILD_PREBUILT)

$(LOCAL_BUILT_MODULE): $(abspath $(devicesvcd_PATH)/devicesvcd)
	( \
	  mkdir -p $(dir $(abspath $@)) && \
	  cp $< $(abspath $@) && \
	  chmod +x $(abspath $@) \
	 ) || exit $?

#
# Data
#

devicesvcd_data_PATH := $(abspath $(LOCAL_PATH))
devicesvcd_data_FILES := socket.io/socket.io.js \
                         index.html \
                         devicesvcd.js \
                         wifi.js \
                         WifiManager-client.js \
                         WifiManager-server.js

include $(CLEAR_VARS)
LOCAL_MODULE := devicesvcd-data
LOCAL_MODULE_CLASS := DATA
LOCAL_MODULE_TAGS := optional
include $(BUILD_PREBUILT)

$(LOCAL_BUILT_MODULE): $(foreach file,$(devicesvcd_data_FILES),$(abspath $(devicesvcd_data_PATH)/$(file)))
	( \
	  mkdir -p $(dir $(abspath $@)) && \
	  tar -C $(devicesvcd_data_PATH) --overwrite -cf $(abspath $@) $(devicesvcd_data_FILES) \
	 ) || exit $?

$(LOCAL_INSTALLED_MODULE): $(LOCAL_BUILT_MODULE)
	( \
	  mkdir -p $(abspath $@) && \
	  tar -C $(abspath $@) --overwrite -xf $(abspath $<) \
	 ) || exit $?
