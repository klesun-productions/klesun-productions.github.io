#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import json
import os
import sys, time
import traceback
import itertools

from collections import OrderedDict as dct

import misc
import service_util
from service_util import Fun

# every function listed here takes single argument - params: dict
# and returns an iterator of json-serializable values


def chunk_iter(chunk_size: int, it: iter) -> iter:
    for i in range(0, chunk_size):
        yield itertools.islice(it, chunk_size)


def flush_chunk(type: str, content: dict):
    print(json.dumps(dct([
        ('chunkType', type),
        ('content', content),
    ])))
    sys.stdout.flush()


def flush_error(type: str, msg: str):
    flush_chunk('interruptingError', dct([
        ('errorType', type),
        ('message', msg),
    ]))


method_dict = {
    'get_anime_users': Fun(
        closure=lambda p: chunk_iter(2000, misc.get_anime_users(p)),
        headers=['Cache-Control: max-age=86400'],
        is_secure=False,
    ),
}


def main():
    print('Content-Type: text/chunked-json;charset=utf-8')
    print('')
    sys.stdout.flush()

    msg = 'Pre-warming chunk to get rid of Apache buffering: ' + '-' * 4096
    flush_chunk('info', {'message': msg})

    try:
        get_params = service_util.read_get()
        method = get_params.pop('f', None)

        if method in method_dict:
            func, headers, is_secure = method_dict[method]
            post_params = service_util.read_post()
            if is_secure and not service_util.is_correct_password(post_params['verySecurePassword']):
                msg = 'Password you passed is wrong - Access Denied'
                flush_error('wrongPassword', msg)
            else:
                func_params = post_params['params'] if 'params' in post_params else {}
                # a hack implying that GET params and func_params are same thing
                # because i'm too lazy to refactor all functions right now
                func_params.update(get_params)

                for iter_chunk in func(func_params):
                    flush_chunk('data', {
                        'chunkItems': list(iter_chunk),
                    })
        else:
            msg = '. '.join([
                'Function - GET[f] = ' + str(method) + ' - does not exist in this service API',
                'You should choose one of [' + ', '.join(k + '()' for k in method_dict.keys()) + ']'
            ])
            flush_error('notExistingFunction', msg)
    except:
        msg = traceback.format_exc()
        flush_error('uncaughtException', msg)

main()