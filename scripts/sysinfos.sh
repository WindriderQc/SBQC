#!/bin/bash

#  adding -x at the previous line would make bash show its actions on the console.
# Alternately, we can use the set command within the script to turn tracing on and off. Use set -x to turn tracing on and set +x to turn tracing off for some segment of the code only

#  chmod +x helloworld.sh    is required to make the file executable.  or chmod 755 to be executable by the shell


echo "sysinfo script - creating html info page"


if [ -f ../../.bash_profile ]; then
    echo "You have a .bash_profile. Things are fine."
else
    echo "Yikes! You have no .bash_profile!"
fi



# copy files or folders through ssh
#scp ./Roms/*.nes pi@192.168.0.141:/home/pi/RetroPie/roms/nes




# sysinfo_page - A script to produce an HTML file

# usage:  ./helloworld.sh  > sysinfo_page.html

##### Constants

TITLE="System Information for $HOSTNAME"
RIGHT_NOW="$(date +"%x %r %Z")"
TIME_STAMP="Updated on $RIGHT_NOW by $USER"


##### Functions

system_info() {
    # Find any release files in /etc

    if ls /etc/*release 1>/dev/null 2>&1; then
        echo "<h2>System release info</h2>"
        echo "<pre>"
        for i in /etc/*release; do

            # Since we can't be sure of the
            # length of the file, only
            # display the first line.

            head -n 1 "$i"
        done
        uname -orp
        echo "</pre>"
    fi

}   # end of system_info


show_uptime()
{
    echo "<h2>System uptime</h2>"
    echo "<pre>"
    uptime
    echo "</pre>"
}


drive_space()
{
    echo "<h2>Filesystem space</h2>"
    echo "<pre>"
    df
    echo "</pre>"
}

home_space() 
{
    echo "<h2>Home directory space by user</h2>"
    echo "<pre>"
    format="%8s%10s%10s   %-s\n"
    printf "$format" "Dirs" " Files " "Blocks" "Directory"
    printf "$format" "----" "-------" "------" "---------"
    if [ $(id -u) = "0" ]; then
        dir_list="/home/*"
    else
        dir_list=$HOME
    fi
    for home_dir in $dir_list; do
        total_dirs=$(find $home_dir -type d | wc -l)
        total_files=$(find $home_dir -type f | wc -l)
        total_blocks=$(du -s $home_dir)
        printf "$format" "$total_dirs" "$total_files " "$total_blocks" 
    done
    echo "</pre>"

}   # end of home_space


hw_detail() 
{
    echo "<h2>Hardware Details  (inxi -Fxz) </h2>"
    echo "<pre>"
    inxi -Fxxxmipr -tc5 -tm5 -usb  -c0  # inxi -Fxpmrz
    echo "</pre>"
}
network_detail()
{
    echo "<h2>Hosts scan on 192.168.0.0/24</h2>"
    echo "<pre>"
    nmap -sn 192.168.0.0/24
    echo
    echo "</pre>"
}

write_page()
{
    cat <<- _EOF_
    <!DOCTYPE html>
    <html>
        <head>
        <title>$TITLE</title>
        </head>
        <body>
        <h1>$TITLE</h1>
        <p><small>$TIME_STAMP</small></p>
        $(system_info)
        $(show_uptime)
        $(drive_space)
        $(home_space)
        $(hw_detail)
        $(network_detail)
        </body>
    </html>
_EOF_

}


##### Main

echo "Writing page"

filename=./public/Tools/System_Info/index.html

write_page > $filename


echo "sysinfo script completed"
echo "page created:  $filename" 
 
