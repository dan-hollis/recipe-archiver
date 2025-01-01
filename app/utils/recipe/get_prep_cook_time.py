def get_prep_cook_time(time_minutes):
    time_hours = time_minutes // 60
    if time_hours == 1:
        time_hours = '1 hour'
    elif time_hours > 0:
        time_hours = f'{time_hours} hours'
    time_minutes = time_minutes % 60
    if time_minutes == 1:
        time_minutes = '1 minute'
    else:
        time_minutes = f'{time_minutes} minutes'
    if not time_hours and time_minutes == '0 minutes':
        time_str = 'None'
    elif time_hours and time_minutes != '0 minutes':
        time_str = f'{time_hours} {time_minutes}'
    elif time_hours:
        return time_hours
    else:
        return time_minutes
    return time_str
