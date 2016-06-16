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

wifisvc_PATH := $(abspath $(LOCAL_PATH))

include $(CLEAR_VARS)
LOCAL_MODULE := wifisvc
LOCAL_MODULE_CLASS := EXECUTABLES
LOCAL_MODULE_TAGS := optional
include $(BUILD_PREBUILT)

$(LOCAL_BUILT_MODULE): $(abspath $(wifisvc_PATH)/wifisvc)
	@( \
	  mkdir -p $(dir $(abspath $@)) && \
	  cp $< $(abspath $@) && \
    chmod +x $(abspath $@) \
	 ) || exit $?

#
# Data
#

wifisvc_js_PATH := $(abspath $(LOCAL_PATH))
wifisvc_js_FILES := index.html \
                    wifisvc.js

include $(CLEAR_VARS)
LOCAL_MODULE := wifisvc.js
LOCAL_MODULE_CLASS := DATA
LOCAL_MODULE_TAGS := optional
include $(BUILD_PREBUILT)

$(LOCAL_BUILT_MODULE): $(foreach file,$(wifisvc_js_FILES),$(abspath $(wifisvc_js_PATH)/$(file)))
	@( \
	  mkdir -p $(dir $(abspath $@)) && \
	  tar -C $(wifisvc_js_PATH) -cf $(abspath $@) $(wifisvc_js_FILES) \
   ) || exit $?

$(LOCAL_INSTALLED_MODULE): $(LOCAL_BUILT_MODULE)
	@( \
	  mkdir -p $(abspath $@) && \
	  tar -C $(abspath $@) -xf $(abspath $<) \
   ) || exit $?
